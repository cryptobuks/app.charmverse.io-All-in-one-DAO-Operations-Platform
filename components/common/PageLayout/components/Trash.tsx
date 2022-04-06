import { Typography, ListItem, ListItemIcon, ListItemText, IconButton, Tooltip } from '@mui/material';
import { Box } from '@mui/system';
import dayjs from 'dayjs';
import { PageWithPermission, usePages } from 'hooks/usePages';
import { useMemo } from 'react';
import RestoreIcon from '@mui/icons-material/Restore';
import DeleteIcon from '@mui/icons-material/Delete';
import { PageIcon } from './PageNavigation';

export default function PageTrash () {
  const { pages } = usePages();

  const deadPagesRecord: Record<string, PageWithPermission | undefined> = {};
  const deadPages = useMemo(() => {
    return Object.values(pages).filter(page => {
      const isDead = page && !page.alive;
      if (isDead) {
        deadPagesRecord[page.id] = page;
      }
      return isDead;
    }).sort((pageA, pageB) => {
      if (pageA?.deletedAt && pageB?.deletedAt) {
        return new Date(pageA.deletedAt).getTime() > new Date(pageB.deletedAt).getTime() ? -1 : 1;
      }
      return 0;
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

  return (
    <div>
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
                <PageIcon isEditorEmpty={false} pageType={deadPage.type} icon={deadPage.icon} />
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
                      {dayjs().to(dayjs(deadPage.deletedAt))}
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
    </div>
  );
}
