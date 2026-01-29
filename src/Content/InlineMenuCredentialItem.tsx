import * as React from 'react';
import MenuItem from '@mui/material/MenuItem';
import { AutoFillCredential } from '../Messaging/Protocol/AutoFillCredential';
import { Badge, MoreHoriz } from '@mui/icons-material';
import { Box, Button, CircularProgress, IconButton, Menu, Tooltip, Typography } from '@mui/material';
import { GetIconResponse } from '../Messaging/Protocol/GetIconResponse';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FontDownloadOutlinedIcon from '@mui/icons-material/FontDownloadOutlined';

import CredentialDetails from '../Shared/Components/CredentialDetails';
import { GetStatusResponse } from '../Messaging/Protocol/GetStatusResponse';
import { Settings } from '../Settings/Settings';
import { useCustomStyle } from '../Contexts/CustomStyleContext';
import { SettingsStore } from '../Settings/SettingsStore';
import { useTranslation } from 'react-i18next';

interface InlineMenuCredentialItemProps {
  status: GetStatusResponse | null;
  credential: AutoFillCredential;
  onFillSingleField: (text: string, appendValue?: boolean) => Promise<void>;
  handleCredentialClick: (credential: AutoFillCredential) => void;
  handleCopyUsername: (credential: AutoFillCredential, notifyAction?: boolean) => void;
  handleCopyPassword: (credential: AutoFillCredential, notifyAction?: boolean) => void;
  handleCopyTotp: (credential: AutoFillCredential, notifyAction?: boolean) => void;
  onCopy: (text: string) => Promise<boolean>;
  onRedirectUrl: (url: string) => void;
  notifyAction: (message: string) => void;
  credentialsAreFromMultipleDatabases: () => boolean;
  getIcon: (databaseId: string, nodeId: string) => Promise<GetIconResponse | null>;
  beforeOpenSubMenu: (showDetails: boolean, restoreIframeSize?: boolean) => void;
  inlineMenuHasScrollbar: () => boolean;
  handleOpenLargeTextView: (uuid: string) => void;
}

export function InlineMenuCredentialItem(props: InlineMenuCredentialItemProps): JSX.Element {
  const {
    status,
    credential,
    onFillSingleField,
    handleCredentialClick,
    handleCopyUsername,
    handleCopyPassword,
    onCopy,
    onRedirectUrl,
    handleCopyTotp,
    credentialsAreFromMultipleDatabases,
    beforeOpenSubMenu,
    inlineMenuHasScrollbar,
    handleOpenLargeTextView,
  } = props;
  const { sizeHandler } = useCustomStyle();
  const [icon, setIcon] = React.useState(credential.icon);
  const [loadingIcon, setLoadingIcon] = React.useState(true);
  const [anchorElDetails, setAnchorElDetails] = React.useState<null | HTMLElement>(null);
  const [openDetailsMenu, setOpenDetailsMenu] = React.useState(false);
  const [settings, setSettings] = React.useState<Settings>(new Settings());
  const [t] = useTranslation('global');
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  React.useEffect(() => {
    const getStoredSettings = async () => {
      const stored = await SettingsStore.getSettings();
      setSettings(stored);
    };

    const getIcon = async () => {
      if (!icon) {
        const iconResponse = await props.getIcon(credential.databaseId, credential.uuid);

        if (iconResponse) {
          setIcon(iconResponse.icon);
        }
      }

      getStoredSettings();
      setLoadingIcon(false);
    };

    getIcon();
  }, []);

  React.useEffect(() => {
    setAnchorEl(null);
  }, [credential]);

  function getCurrentTotpCode(credential: AutoFillCredential, formatted = true): string {
    return AutoFillCredential.getCurrentTotpCode(credential, formatted);
  }

  const handleDetailsButtonClick = (event: any) => {
    if (!settings.hideCredentialDetailsOnInlineMenu) {
      beforeOpenSubMenu(true);
      setAnchorElDetails(event.currentTarget);

      setTimeout(() => {
        setOpenDetailsMenu(true);
      }, 50);
    }

    event.stopPropagation();
    event.preventDefault();
  };

  const handleLargeTextView = (event: any) => {
    handleOpenLargeTextView(credential.uuid);
    event.stopPropagation();
    event.preventDefault();
  };

  const handleMoreButtonClick = (event: any) => {
    setAnchorEl(event.currentTarget);
    event.stopPropagation();
    event.preventDefault();
  };

  const onCopyUsername = (event: any) => {
    handleCopyUsername(credential);
    setAnchorEl(null);
    event.stopPropagation();
    event.preventDefault();
  };
  const onCopyPassword = (event: any) => {
    handleCopyPassword(credential);
    setAnchorEl(null);
    event.stopPropagation();
    event.preventDefault();
  };

  const onCopyTotp = (event: any) => {
    handleCopyTotp(credential);
    event.stopPropagation();
    event.preventDefault();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleCloseDetails = () => {
    setAnchorElDetails(null);
    setOpenDetailsMenu(false);

    setTimeout(() => {
      beforeOpenSubMenu(true, true);
    }, 200);
  };

  return (
    <MenuItem
      selected={anchorElDetails !== null}
      key={credential.uuid}
      onClick={() => {
        handleCredentialClick(credential);
      }}
      sx={{
        py: '4px',
        px: '10px',
        pr: sizeHandler.getInlineMenuMarginRight(settings),
        minHeight: '38px',
        borderRadius: '6px',
        mx: '4px',
        my: '1px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
        '&:hover': {
          backgroundColor: theme => theme.palette.mode === 'dark'
            ? 'rgba(59,130,246,0.18)'
            : 'rgba(59,130,246,0.08)',
        },
        '&.Mui-selected': {
          backgroundColor: theme => theme.palette.mode === 'dark'
            ? 'rgba(59,130,246,0.30)'
            : 'rgba(59,130,246,0.14)',
        },
        '&.Mui-selected:hover': {
          backgroundColor: theme => theme.palette.mode === 'dark'
            ? 'rgba(59,130,246,0.35)'
            : 'rgba(59,130,246,0.18)',
        },
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', flexGrow: 1, gap: '8px' }}>
        <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 24, minWidth: 24 }}>
          {loadingIcon ? (
            <CircularProgress style={{ color: 'gray' }} size={16} />
          ) : icon ? (
            <Box
              component="img"
              display="block"
              sx={{
                height: 24,
                width: 24,
                borderRadius: '5px',
              }}
              alt="Icon"
              src={icon}
            />
          ) : (
            <Badge sx={{ fontSize: 18, opacity: 0.4 }} />
          )}
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            flexGrow: 1,
            width: 0,
            gap: 0,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Typography
              sx={{
                pb: 0,
                mb: 0,
                textAlign: 'left',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                mr: !settings.hideCredentialDetailsOnInlineMenu ? 0 : 1,
                textOverflow: `${!settings.hideCredentialDetailsOnInlineMenu ? 'ellipsis' : 'none'}`,
                fontSize: '0.8125rem',
                fontWeight: 500,
                lineHeight: 1.35,
                letterSpacing: '-0.01em',
              }}
              variant="body2"
            >
              {credential.title}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'row',
                gap: 0,
                alignItems: 'center',
                flexShrink: 0,
              }}
            >
              {credential.totp.length > 0 && (
                <Button
                  size="small"
                  onClick={onCopyTotp}
                  sx={{
                    minWidth: 0,
                    px: '6px',
                    py: '1px',
                    fontSize: '0.675rem',
                    lineHeight: 1,
                    fontFamily: 'SF Mono, Menlo, monospace',
                    fontWeight: 600,
                    borderRadius: '4px',
                    backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(59,130,246,0.15)' : 'rgba(59,130,246,0.08)',
                    color: theme => theme.palette.mode === 'dark' ? 'rgba(130,177,255,0.95)' : 'rgba(30,90,210,0.85)',
                    '&:hover': {
                      backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.14)',
                    },
                  }}
                >
                  {getCurrentTotpCode(credential)}
                </Button>
              )}
              <Menu
                id="basic-menu"
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                sx={{ zIndex: '2147483642' }}
                MenuListProps={{
                  'aria-labelledby': 'basic-button',
                  sx: { p: 0 },
                }}
                PaperProps={{ sx: { borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: '1px solid', borderColor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' } }}
                onClick={e => e.stopPropagation()}
              >
                <MenuItem dense onClick={onCopyUsername}>{t('inline-menu-credential-item.copy-username')}</MenuItem>
                <MenuItem dense onClick={onCopyPassword}>{t('inline-menu-credential-item.copy-password')}</MenuItem>
              </Menu>
              {settings.hideCredentialDetailsOnInlineMenu && (
                <IconButton
                  size="small"
                  sx={{
                    p: '3px',
                    borderRadius: '4px',
                    opacity: 0.35,
                    '&:hover': { opacity: 0.7, backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
                  }}
                  onClick={handleMoreButtonClick}
                >
                  <MoreHoriz sx={{ fontSize: 16 }} />
                </IconButton>
              )}

              <Menu
                id="basic-menu-details"
                open={openDetailsMenu}
                anchorEl={anchorElDetails}
                onClose={handleCloseDetails}
                sx={{ ml: inlineMenuHasScrollbar() ? 2 : 0.3 }}
                MenuListProps={{
                  'aria-labelledby': 'basic-button-details',
                  sx: { p: 0 },
                }}
                anchorOrigin={{
                  vertical: 'center',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'center',
                  horizontal: 'left',
                }}
                onClick={e => e.stopPropagation()}
                PaperProps={{
                  sx: {
                    boxShadow: '0 8px 32px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.08)',
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                  },
                }}
              >
                <Box sx={{ width: 300, maxHeight: '300px' }}>
                  <CredentialDetails
                    credential={credential}
                    getStatus={async () => {
                      return status;
                    }}
                    onCopyUsername={() => {
                      handleCopyUsername(credential, false);
                      handleCloseDetails();
                    }}
                    onCopyPassword={() => {
                      handleCopyPassword(credential, false);
                      handleCloseDetails();
                    }}
                    onCopyTotp={() => {
                      handleCopyTotp(credential, false);
                      handleCloseDetails();
                    }}
                    onCopy={async (text: string) => {
                      await onCopy(text);
                      handleCloseDetails();
                      return true;
                    }}
                    onFillSingleField={onFillSingleField}
                    onRedirectUrl={(url: string) => {
                      onRedirectUrl(url);
                      setOpenDetailsMenu(false);
                      handleCloseDetails();
                      return true;
                    }}
                    notifyAction={props.notifyAction}
                    showTitle={false}
                    showModified={false}
                    allowAutofillField={true}
                  />
                </Box>
              </Menu>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: '4px', alignItems: 'center' }}>
            <Typography
              sx={{
                color: 'text.secondary',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                fontSize: '0.6875rem',
                lineHeight: 1.25,
                opacity: 0.6,
                letterSpacing: '0.01em',
              }}
              variant="caption"
            >
              {credential.username}
            </Typography>
            {credentialsAreFromMultipleDatabases() && (
              <Typography
                sx={{
                  color: 'text.disabled',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  fontSize: '0.65rem',
                  opacity: 0.5,
                }}
                variant="caption"
              >
                {credential.databaseName}
              </Typography>
            )}
          </Box>
        </Box>

        <Box sx={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '1px', ml: '2px' }}>
          <Tooltip title={t('inline-menu-credential-item.large-text-view')} placement="top" arrow>
            <IconButton
              size="small"
              sx={{
                p: '3px',
                borderRadius: '4px',
                opacity: 0.35,
                '&:hover': { opacity: 0.7, backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
              }}
              onClick={handleLargeTextView}
            >
              <FontDownloadOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          {!settings.hideCredentialDetailsOnInlineMenu && (
            <IconButton
              size="small"
              sx={{
                p: '3px',
                borderRadius: '4px',
                opacity: 0.35,
                '&:hover': { opacity: 0.7, backgroundColor: theme => theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' },
              }}
              onClick={handleDetailsButtonClick}
            >
              <ChevronRightIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>
      </Box>
    </MenuItem>
  );
}
