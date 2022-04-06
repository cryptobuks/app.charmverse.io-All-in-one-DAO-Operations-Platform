
import styled from '@emotion/styled';
import { css, Theme } from '@emotion/react';
import AddIcon from '@mui/icons-material/Add';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import BountyIcon from '@mui/icons-material/RequestPage';
import SettingsIcon from '@mui/icons-material/Settings';
import NavigateNextIcon from '@mui/icons-material/ArrowRightAlt';
import Box from '@mui/material/Box';
import Button from 'components/common/Button';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MuiLink from '@mui/material/Link';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Page, Prisma } from '@prisma/client';
import charmClient from 'charmClient';
import mutator from 'components/common/BoardEditor/focalboard/src/mutator';
import { getSortedBoards } from 'components/common/BoardEditor/focalboard/src/store/boards';
import { useAppSelector } from 'components/common/BoardEditor/focalboard/src/store/hooks';
import { useCurrentSpace } from 'hooks/useCurrentSpace';
import { PageWithPermission, usePages } from 'hooks/usePages';
import { useSpaces } from 'hooks/useSpaces';
import { useUser } from 'hooks/useUser';
import { LoggedInUser } from 'models';
import NextLink from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { untitledPage } from 'seedData';
import CreateWorkspaceForm from 'components/common/CreateSpaceForm';
import Link from 'components/common/Link';
import { Modal } from 'components/common/Modal';
import NewPageMenu from 'components/common/NewPageMenu';
import WorkspaceAvatar from 'components/common/WorkspaceAvatar';
import DeleteIcon from '@mui/icons-material/Delete';
import useSWR from 'swr';
import { bindTrigger, bindPopover, usePopupState } from 'material-ui-popup-state/hooks';
import { ListItem, ListItemAvatar, ListItemIcon, ListItemText } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import PageNavigation, { StyledPageIcon } from './PageNavigation';
import { headerHeight } from './Header';

dayjs.extend(relativeTime);

const AvatarLink = styled(NextLink)`
  cursor: pointer;
`;

const WorkspacesContainer = styled.div`
  float: left;
  height: 100%;
  border-right: 1px solid ${({ theme }) => theme.palette.divider};
  padding: ${({ theme }) => theme.spacing(1)};
`;

const WorkspaceLabel = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: relative;
  .add-a-page {
    display: flex;
    position: absolute;
    right: 8px;
    top: 0px;
  }
`;

const SidebarContainer = styled.div`
  display: flex;
  background-color: ${({ theme }) => theme.palette.sidebar.background};
  height: 100%;

  .add-a-page {
    opacity: 0;
    transition: opacity 0.2s ease-in-out;
  }
  &:hover .add-a-page {
    opacity: 1;
  }
`;

const sidebarItemStyles = ({ theme }: { theme: Theme }) => css`
  padding-left: ${theme.spacing(2)};
  padding-right: ${theme.spacing(2)};
  align-items: center;
  color: ${theme.palette.secondary.main};
  display: flex;
  font-size: 14px;
  font-weight: 500;
  padding-top: 4px;
  padding-bottom: 4px;

  :hover {
    background-color: ${theme.palette.action.hover};
    color: inherit;
  }

  svg {
    font-size: 1.2em;
    margin-right: ${theme.spacing(1)};
  }
`;

const SectionName = styled(Typography)`
  padding-left: ${({ theme }) => theme.spacing(2)};
  padding-right: ${({ theme }) => theme.spacing(2)};;
  color: ${({ theme }) => theme.palette.secondary.main};
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.03em;
  margin-bottom: ${({ theme }) => theme.spacing(0.5)};
`;

const StyledSidebarLink = styled(Link)<{ active: boolean }>`
  ${sidebarItemStyles}
  ${({ active, theme }) => active ? `
    background-color: ${theme.palette.action.selected};
    color: ${theme.palette.text.primary};
  ` : ''}
`;

const StyledSidebarItem = styled(Box)`
  ${sidebarItemStyles}
`;

const SidebarHeader = styled.div(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(0, 2),
  '& .MuiIconButton-root': {
    opacity: 0,
    transition: theme.transitions.create('opacity', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen
    })
  },
  '&:hover .MuiTypography-root': {
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  '&:hover .MuiIconButton-root': {
    opacity: 1
  },
  // necessary for content to be below app bar
  minHeight: headerHeight
}));

const ScrollingContainer = styled.div<{ isScrolled: boolean }>`
  flex-grow: 1;
  overflow-y: auto;
  transition: border-color 0.2s ease-out;
  border-top: 1px solid transparent;
  ${({ isScrolled, theme }) => isScrolled ? `border-top: 1px solid ${theme.palette.divider}` : ''};
`;

function SidebarLink ({ active, href, icon, label }: { active: boolean, href: string, icon: any, label: string }) {
  return (
    <StyledSidebarLink active={active} href={href}>
      {icon}
      {label}
    </StyledSidebarLink>
  );
}

interface SidebarProps {
  closeSidebar: () => void;
  favorites: LoggedInUser['favorites'];
}

export default function Sidebar ({ closeSidebar, favorites }: SidebarProps) {
  const router = useRouter();
  const [user, setUser] = useUser();
  const [space] = useCurrentSpace();
  const [spaces, setSpaces] = useSpaces();
  const boards = useAppSelector(getSortedBoards);
  const { currentPageId, pages, setPages, addPageAndRedirect } = usePages();
  const [spaceFormOpen, setSpaceFormOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const favoritePageIds = favorites.map(f => f.pageId);
  const intl = useIntl();
  const deadPagesRecord: Record<string, PageWithPermission | undefined> = {};
  const deadPages = useMemo(() => {
    return Object.values(pages).filter(page => {
      const isDead = page && !page.alive;
      if (isDead) {
        deadPagesRecord[page.id] = page;
      }
      return isDead;
    }) as PageWithPermission[];
  }, [pages]);

  const breadcrumbsRecord = useMemo(() => {
    const _breadcrumbsRecord: Record<string, string[]> = {};
    deadPages?.forEach(deadPage => {
      const breadcrumbs: string[] = [];
      let activePage = pages[deadPage.id] ?? deadPagesRecord[deadPage.id];
      while (activePage?.parentId) {
        activePage = pages[activePage.parentId];
        if (activePage) {
          breadcrumbs.unshift(activePage.title || 'Untitled');
        }
      }
      _breadcrumbsRecord[deadPage.id] = breadcrumbs;
    });

    return _breadcrumbsRecord;
  }, [deadPages]);

  const popupState = usePopupState({ variant: 'popover', popupId: 'multi-payment-modal' });

  function showSpaceForm () {
    setSpaceFormOpen(true);
  }

  function closeSpaceForm () {
    setSpaceFormOpen(false);
  }

  function onScroll (e: React.UIEvent<HTMLDivElement>) {
    setIsScrolled(e.currentTarget?.scrollTop > 0);
  }

  async function addSpace (spaceOpts: Prisma.SpaceCreateInput) {
    const newSpace = await charmClient.createSpace(spaceOpts);
    setSpaces([...spaces, newSpace]);
    // refresh user permissions
    const _user = await charmClient.getUser();
    setUser(_user);
    router.push(`/${newSpace.domain}`);
  }

  async function deletePage (pageId: string) {
    const currentPage = pages[currentPageId];
    const page = pages[pageId];
    if (page) {
      const deletedPageIds = await charmClient.deletePage(page.id);
      deletedPageIds.forEach(deletedPageId => {
        delete pages[deletedPageId];
      });
      let newPages = { ...pages };
      if (Object.keys(newPages).length === 0) {
        const newPage = await charmClient.createPage(untitledPage({
          userId: user!.id,
          spaceId: space!.id
        }));
        newPages = { [newPage.id]: newPage };
      }
      setPages(newPages);
    }
    if (page?.boardId) {
      const board = boards.find(b => b.id === page.boardId);
      if (board) {
        mutator.deleteBlock(
          board,
          intl.formatMessage({ id: 'Sidebar.delete-board', defaultMessage: 'Delete board' }),
          async () => {
            // success
          },
          async () => {
            // error
          }
        );
      }
    }

    // Redirect from current page
    if (page && currentPage && page.id === currentPage.id) {
      let newPath = `/${space!.domain}`;
      if (currentPage.parentId) {
        const parent = pages[currentPage.parentId];
        if (parent) {
          newPath += `/${parent.path}`;
        }
      }
      router.push(newPath);
    }
  }

  return (
    <SidebarContainer>
      <WorkspacesContainer>
        <Grid container spacing={2} flexDirection='column'>
          {spaces.map(workspace => (
            <Grid item key={workspace.domain}>
              <AvatarLink href={`/${workspace.domain}`} passHref>
                <MuiLink>
                  <Tooltip title={workspace.name} placement='right' arrow>
                    <span>
                      <WorkspaceAvatar active={space?.domain === workspace.domain} name={workspace.name} />
                    </span>
                  </Tooltip>
                </MuiLink>
              </AvatarLink>
            </Grid>
          ))}
          <Grid item>
            <IconButton sx={{ borderRadius: '8px' }} onClick={showSpaceForm}><AddIcon /></IconButton>
          </Grid>
        </Grid>
        <Modal open={spaceFormOpen} onClose={closeSpaceForm}>
          <CreateWorkspaceForm onSubmit={addSpace} onCancel={closeSpaceForm} />
          <Typography variant='body2' align='center' sx={{ pt: 3 }}>
            <Button variant='text' href='/join' endIcon={<NavigateNextIcon />}>
              Join an existing workspace
            </Button>
          </Typography>
        </Modal>
      </WorkspacesContainer>
      {space && (
        <Box display='flex' flexDirection='column' sx={{ height: '100%', flexGrow: 1, width: 'calc(100% - 57px)' }}>
          <SidebarHeader>
            <Typography><strong>{space.name}</strong></Typography>
            <IconButton onClick={closeSidebar}>
              <ChevronLeftIcon />
            </IconButton>
          </SidebarHeader>
          <Box mb={2}>
            <SidebarLink
              active={router.pathname.startsWith('/[domain]/settings')}
              href={`/${space.domain}/settings/workspace`}
              icon={<SettingsIcon color='secondary' fontSize='small' />}
              label='Settings & Members'
            />
          </Box>
          <ScrollingContainer isScrolled={isScrolled} onScroll={onScroll}>
            {favoritePageIds.length > 0 && (
            <Box mb={2}>
              <SectionName>
                FAVORITES
              </SectionName>
              <PageNavigation
                isFavorites={true}
                space={space}
                rootPageIds={favoritePageIds}
              />
            </Box>
            )}
            <WorkspaceLabel>
              <SectionName>
                WORKSPACE
              </SectionName>
              <div className='add-a-page'>
                <NewPageMenu tooltip='Add a page' addPage={page => addPageAndRedirect(page)} />
              </div>
            </WorkspaceLabel>
            <Box sx={{ mb: 6 }}>
              <PageNavigation
                space={space}
                deletePage={deletePage}
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <SidebarLink
                href={`/${space.domain}/bounties`}
                active={router.pathname.startsWith('/[domain]/bounties')}
                icon={<BountyIcon fontSize='small' />}
                label='Bounties'
              />
            </Box>
            <Box sx={{ mb: 2 }} {...bindTrigger(popupState)}>
              <StyledSidebarItem>
                <DeleteIcon fontSize='small' />
                Trash
              </StyledSidebarItem>
            </Box>
          </ScrollingContainer>
        </Box>
      )}
      <Modal
        size='large'
        {...bindPopover(popupState)}
      >
        <Typography variant='h6' color='secondary'>
          Trash
        </Typography>
        <Box sx={{
          maxHeight: 500,
          overflow: 'auto'
        }}
        >
          {deadPages.length === 0 ? <Typography variant='subtitle1'> No pages in thrash </Typography> : deadPages.map(deadPage => {
            return (
              <ListItem>
                <ListItemIcon sx={{
                  minWidth: 40
                }}
                >
                  {deadPage.icon && <StyledPageIcon icon={deadPage.icon} />}
                </ListItemIcon>
                <ListItemText
                  sx={{
                    '& .MuiTypography-root': {
                      display: 'flex',
                      alignItems: 'center'
                    } }}
                  secondary={(
                    <Box>
                      <div>
                        {`${dayjs().to(dayjs(deadPage.deletedAt))}`}
                      </div>
                      {breadcrumbsRecord[deadPage.id] && (
                      <Box display='flex' gap={0.5}>
                        {breadcrumbsRecord[deadPage.id].map((crumb, crumbIndex) => (
                          <>
                            <span>{crumb}</span>
                            {crumbIndex !== breadcrumbsRecord[deadPage.id].length - 1 ? <span>/</span> : null}
                          </>
                        ))}
                      </Box>
                      )}
                    </Box>
                  )}
                >
                  {deadPage.title || 'Untitled'}
                </ListItemText>
                <ListItemIcon>
                  <IconButton>
                    <Tooltip title='Delete permanently'>
                      <DeleteIcon fontSize='small' color='error' />
                    </Tooltip>
                  </IconButton>
                  <IconButton>
                    <Tooltip title='Restore Page'>
                      <RestoreIcon fontSize='small' color='info' />
                    </Tooltip>
                  </IconButton>
                </ListItemIcon>
              </ListItem>
            );
          })}
        </Box>
      </Modal>
    </SidebarContainer>
  );
}
