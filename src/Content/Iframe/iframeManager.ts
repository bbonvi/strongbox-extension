import browser from 'webextension-polyfill';
import { ContentScriptManager, MainPageInformation } from '../ContentScriptManager';
import { Utils } from '../../Utils';
import { SettingsStore } from '../../Settings/SettingsStore';

export enum IframeComponentTypes {
  InlineMiniFieldMenu,
  CreateNewEntryDialog,
  NotificationToast,
}

export enum IframeMessageTypes {
  render,
  remove,
  resize,
  backToInlineMiniFieldMenu,
  onFillWithCredential,
  onFillSingleField,
  onCreatedNewItem,
  showCreateNewEntryDialog,
  showNotificationToast,
  hideInlineMenusForAWhile,
  colorSchemeChanged,
  onRedirectUrl,
  onCopy,
  showLargeTextView,
}

export class IframeManager {
  contentScriptManager: ContentScriptManager;
  iframe: HTMLIFrameElement;
  anchorEl: HTMLInputElement;
  iframeComponentType: IframeComponentTypes;
  isPasswordField: boolean;
  areMainPageEventListenersAdded = false;
  notificationToastMessage = '';

  constructor(contentScriptManager: ContentScriptManager) {
    this.contentScriptManager = contentScriptManager;
  }

  initialize(iframeComponentType: IframeComponentTypes, anchorEl: HTMLInputElement, isPasswordField = false, notificationToastMessage = '') {
    this.iframeComponentType = iframeComponentType;
    this.anchorEl = anchorEl;
    this.isPasswordField = isPasswordField;
    this.notificationToastMessage = notificationToastMessage;

    
    this.remove();

    
    requestAnimationFrame(() => {
      this.create();
    });
  }

  private create() {
    const existRoot = document.querySelector('com-strongbox-extension');

    if (!existRoot) {
      
      const mainRoot = document.createElement('com-strongbox-extension');
      const iframeShadowContainer = mainRoot.attachShadow({ mode: 'open' });
      this.iframe = document.createElement('iframe');

      
      if (!Utils.isFirefox()) {
        this.iframe.setAttribute('sandbox', 'allow-scripts'); 
      }

      this.iframe.src = browser.runtime.getURL('iframe.html');

      
      iframeShadowContainer.appendChild(this.iframe);
      document.body.append(mainRoot);

      
      this.defineStyle();

      

      const onMainPageScrolled = () => {
        if (this.iframeComponentType == IframeComponentTypes.InlineMiniFieldMenu) {
          this.positionInlineMenu();
        }
      };

      const onMessageReceivedFromIFrame = async (event: MessageEvent) => {
        switch (event.data.type) {
          case IframeMessageTypes.remove: {
            this.remove();
            break;
          }
          case IframeMessageTypes.resize: {
            this.iframe.style.width = event.data.data.width;
            this.iframe.style.height = event.data.data.height;
            if (this.iframeComponentType == IframeComponentTypes.InlineMiniFieldMenu) {
              const w = parseInt(event.data.data.width) || 0;
              const h = parseInt(event.data.data.height) || 0;
              this.positionInlineMenu(w, h);
            }
            break;
          }
          case IframeMessageTypes.backToInlineMiniFieldMenu: {
            this.initialize(IframeComponentTypes.InlineMiniFieldMenu, this.anchorEl);
            break;
          }
          case IframeMessageTypes.onFillWithCredential: {

            const credential = event.data.data;
            await this.contentScriptManager.onFillWithCredential(credential, this.anchorEl, this.isPasswordField);
            this.remove();
            break;
          }
          case IframeMessageTypes.onFillSingleField: {

            const text = event.data.data.text;
            const appendValue = event.data.data.appendValue ?? false;
            await this.contentScriptManager.onFillSingleField(text, this.anchorEl, appendValue);

            if (!appendValue) {
              this.remove();
            }
            break;
          }
          case IframeMessageTypes.onCreatedNewItem: {
            this.contentScriptManager.onCreatedNewItem(event.data.data.credential, event.data.data.message);
            this.remove();
            break;
          }
          case IframeMessageTypes.showCreateNewEntryDialog: {
            this.initialize(IframeComponentTypes.CreateNewEntryDialog, this.anchorEl);
            break;
          }
          case IframeMessageTypes.showNotificationToast: {
            this.initialize(IframeComponentTypes.NotificationToast, this.anchorEl, false, event.data.data);
            break;
          }
          case IframeMessageTypes.hideInlineMenusForAWhile: {
            this.contentScriptManager.hideInlineMenusForAWhile = true;
            break;
          }
          case IframeMessageTypes.showLargeTextView: {
            this.contentScriptManager.showLargeTextView = true;
            break;
          }
          case IframeMessageTypes.colorSchemeChanged: {
            this.iframe.style.colorScheme = event.data.data;

            break;
          }
          case IframeMessageTypes.onRedirectUrl: {
            const url = event.data.data;
            await this.contentScriptManager.onLaunchUrl(url);
            break;
          }
          case IframeMessageTypes.onCopy: {
            const text = event.data.data;
            await this.contentScriptManager.onCopy(text);
            break;
          }
          default:
            break;
        }
      };

      const onMainPageClickPressed = (event: Event) => {
        setTimeout(() => {
          const clickedElement = event.target as HTMLElement;

          
          let siblings: Array<Element> = [];
          if (clickedElement.parentElement) {
            siblings = Array.from(clickedElement.parentElement.children);
          }

          if (!siblings.includes(this.contentScriptManager.currentInlineMenuInputElement as Element)) {
            this.remove();
          }
        }, 100); 
      };

      const onMainPageKeyup = (event: KeyboardEvent) => {
        if (event.key === 'Escape' || (event.key === 'Tab' && this.anchorEl != document.activeElement)) {
          this.remove();
        } else if (event.key === 'ArrowDown') {
          this.iframe.focus();
        }
      };

      const onIFrameLoaded = async () => {
        const stored = await SettingsStore.getSettings();
        const url = await this.contentScriptManager.getFavIconUrl();
        const favIconBase64 = url ? await this.contentScriptManager.getFavIconBase64Data(url) : null;
        const isDefaultFavIcon = favIconBase64 == null;
        const favIconUrl: string | null = isDefaultFavIcon ? null : url;
        const inlineMenuTruncatedHeight = this.iframe.getAttribute('inline-menu-truncated-height') ?? null;

        const mainPageInformation: MainPageInformation = {
          title: document.title,
          url: document.location.href,
          favIconBase64,
          favIconUrl,
          inlineMenuTruncatedHeight,
        };

        switch (this.iframeComponentType) {
          case IframeComponentTypes.InlineMiniFieldMenu:
          case IframeComponentTypes.CreateNewEntryDialog: {
            this.iframe.contentWindow?.postMessage(
              {
                type: IframeMessageTypes.render,
                data: { iframeComponentType: this.iframeComponentType, mainPageInformation, showScrollbars: stored.showScrollbars },
              },
              '*'
            );
            break;
          }
          case IframeComponentTypes.NotificationToast: {
            this.iframe.contentWindow?.postMessage(
              {
                type: IframeMessageTypes.render,
                data: { iframeComponentType: this.iframeComponentType, message: this.notificationToastMessage },
              },
              '*'
            );
            break;
          }
          default:
            break;
        }
      };

      
      this.iframe.addEventListener('load', onIFrameLoaded);

      
      if (!this.areMainPageEventListenersAdded) {
        window.addEventListener('scroll', onMainPageScrolled);
        window.addEventListener('message', onMessageReceivedFromIFrame);
        window.addEventListener('click', onMainPageClickPressed);
        window.addEventListener('keyup', onMainPageKeyup);

        this.areMainPageEventListenersAdded = true;
      }
    }
  }

  positionInlineMenu(iframeW?: number, iframeH?: number) {
    const inputRect = this.anchorEl.getBoundingClientRect();
    if (!iframeW) iframeW = parseInt(this.iframe.style.width) || this.iframe.offsetWidth || 0;
    if (!iframeH) iframeH = parseInt(this.iframe.style.height) || this.iframe.offsetHeight || 0;
    const viewW = document.documentElement.clientWidth;
    const viewH = document.documentElement.clientHeight;

    let top = inputRect.bottom;
    let left = inputRect.left;

    // Clamp right edge
    if (left + iframeW > viewW) {
      left = Math.max(0, viewW - iframeW);
    }

    // If popup overflows bottom, show above the input instead
    if (top + iframeH > viewH) {
      const above = inputRect.top - iframeH;
      if (above >= 0) {
        top = above;
      } else {
        top = inputRect.top > viewH - inputRect.bottom ? Math.max(0, inputRect.top - iframeH) : inputRect.bottom;
      }
    }

    this.iframe.style.top = top + 'px';
    this.iframe.style.left = left + 'px';
  }

  restoreFocus() {
    requestAnimationFrame(() => {
      this.anchorEl?.focus();
    });
  }

  remove() {
    const existRoot = document.querySelector('com-strongbox-extension');
    existRoot?.remove();
  }

  private defineStyle() {
    this.iframe.style.display = 'block';
    this.iframe.style.position = 'fixed';
    this.iframe.style.border = 'none';
    this.iframe.style.zIndex = '2147483647';
    this.iframe.style.overflow = 'hidden';
    this.iframe.style.colorScheme = 'none';
    this.iframe.setAttribute('scrolling', 'no');

    
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `com-strongbox-extension {visibility: visible !important; /* Ensure visibility for Strongbox Extension  */}`;
    document.head.appendChild(styleElement);

    switch (this.iframeComponentType) {
      case IframeComponentTypes.InlineMiniFieldMenu: {
        const inputRect = this.anchorEl.getBoundingClientRect();

        this.prepareInlineMenuTruncated(inputRect);

        this.iframe.style.top = inputRect.bottom + 'px';
        this.iframe.style.left = inputRect.left + 'px';
        this.iframe.style.width = '0px';
        this.iframe.style.height = '0px';

        // Re-clamp after content loads via the resize handler
        break;
      }
      case IframeComponentTypes.CreateNewEntryDialog: {
        this.iframe.style.top = '0';
        this.iframe.style.left = '0';
        this.iframe.style.width = '100%';
        this.iframe.style.height = '100%';
        break;
      }
      case IframeComponentTypes.NotificationToast: {
        this.iframe.style.bottom = '0';
        break;
      }
      default:
        break;
    }
  }

  prepareInlineMenuTruncated = (inputRect: DOMRect): void => {
    const parent = document.body.getBoundingClientRect();
    const widthForRenderMenu = parent.bottom - inputRect.bottom;

    const isTruncated = widthForRenderMenu >= 0 && widthForRenderMenu < 300;
    if (isTruncated) {
      if (widthForRenderMenu < 100) {
        this.iframe.setAttribute('inline-menu-truncated-height', (widthForRenderMenu + 80).toString());
      } else {
        this.iframe.setAttribute('inline-menu-truncated-height', widthForRenderMenu.toString());
      }
    }
  };
}
