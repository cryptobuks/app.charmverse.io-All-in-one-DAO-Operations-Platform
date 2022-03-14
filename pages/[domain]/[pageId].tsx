import { Prisma } from '@prisma/client';
import charmClient from 'charmClient';
import { PageLayout } from 'components/common/page-layout';
import { DatabaseEditor } from 'components/databases';
import { Editor } from 'components/editor';
import { useCurrentSpace } from 'hooks/useCurrentSpace';
import { usePages } from 'hooks/usePages';
import { usePageTitle } from 'hooks/usePageTitle';
import debouncePromise from 'lib/utilities/debouncePromise';
import { Page } from 'models';
import { useRouter } from 'next/router';
import { ReactElement, useEffect, useMemo, useState } from 'react';
import ErrorPage from 'components/common/errors/ErrorPage';

/**
 * @viewId - Enforce a specific view inside the nested blocks editor
 */
interface IBlocksEditorPage {
  publicShare?: boolean
}

export default function BlocksEditorPage ({ publicShare = false }: IBlocksEditorPage) {

  const { currentPageId, setIsEditing, pages, setPages, setCurrentPageId } = usePages();
  const router = useRouter();
  const pageId = router.query.pageId as string;
  const [, setTitleState] = usePageTitle();
  const [pageNotFound, setPageNotFound] = useState(false);
  const [space] = useCurrentSpace();

  const debouncedPageUpdate = useMemo(() => {
    return debouncePromise((input: Prisma.PageUpdateInput) => {
      setIsEditing(true);
      return charmClient.updatePage(input);
    }, 500);
  }, []);

  async function setPage (updates: Partial<Page>) {
    if (!currentPageId || publicShare === true) {
      return;
    }
    setPages((_pages) => ({
      ..._pages,
      [currentPageId]: {
        ..._pages[currentPageId],
        ...updates
      }
    }));
    if (updates.hasOwnProperty('title')) {
      setTitleState(updates.title || 'Untitled');
    }
    debouncedPageUpdate({ id: currentPageId, ...updates } as Prisma.PageUpdateInput)
      .catch((err: any) => {
        console.error('Error saving page', err);
      })
      .finally(() => {
        setIsEditing(false);
      });
  }

  async function loadPublicPage (publicPageId: string) {
    const page = await charmClient.getPublicPage(publicPageId);
    setTitleState(page.title);
    setCurrentPageId(page.id);
    setPages({
      [page.id]: page
    });
  }

  const pagesLoaded = Object.keys(pages).length > 0;

  useEffect(() => {
    if (publicShare === true && pageId) {
      loadPublicPage(pageId as string);
    }
    else if (pageId && pagesLoaded) {
      const pageByPath = pages[pageId] || Object.values(pages).find(page => page.path === pageId);
      if (pageByPath) {
        setTitleState(pageByPath.title);
        setCurrentPageId(pageByPath.id);
      }
      else {
        setPageNotFound(true);
        setTitleState('Page Not Found');
      }
    }
    else {
      setTitleState('');
    }
  }, [pageId, pagesLoaded, space]);

  const currentPage = pages[currentPageId];

  if (!space) {
    return <ErrorPage message={'You don\'t have access to this space'} />;
  }
  if (pageNotFound) {
    return <ErrorPage message={'Sorry, that page doesn\'t exist'} />;
  }
  else if (!currentPage) {
    return null;
  }
  else if (currentPage.type === 'board') {
    return <DatabaseEditor page={currentPage} setPage={setPage} readonly={publicShare} />;
  }
  else {
    return <Editor page={currentPage} setPage={setPage} readOnly={publicShare} />;
  }
}

BlocksEditorPage.getLayout = (page: ReactElement) => {
  return (
    <PageLayout>
      {page}
    </PageLayout>
  );
};
