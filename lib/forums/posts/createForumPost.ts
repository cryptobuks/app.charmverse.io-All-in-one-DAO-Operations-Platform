import type { Post, Prisma } from '@prisma/client';
import { findChildren } from 'prosemirror-utils';
import { v4 } from 'uuid';

import { prisma } from 'db';
import { trackUserAction } from 'lib/metrics/mixpanel/trackUserAction';
import { getNodeFromJson } from 'lib/prosemirror/getNodeFromJson';
import { InsecureOperationError } from 'lib/utilities/errors';

import { getPostPath } from './getPostPath';

export type CreateForumPostInput = Pick<
  Post,
  'createdBy' | 'spaceId' | 'content' | 'contentText' | 'title' | 'categoryId'
>;

export async function createForumPost({
  content,
  contentText,
  createdBy,
  spaceId,
  title,
  categoryId
}: CreateForumPostInput): Promise<Post> {
  if (categoryId) {
    const category = await prisma.postCategory.findUnique({
      where: {
        id: categoryId
      },
      select: {
        spaceId: true
      }
    });

    if (spaceId !== category?.spaceId) {
      throw new InsecureOperationError('Cannot update post with a category from another space');
    }
  }

  const postId = v4();

  const createdPost = await prisma.post.create({
    data: {
      id: postId,
      title,
      content: (content ?? undefined) as Prisma.InputJsonObject,
      contentText,
      category: {
        connect: {
          id: categoryId
        }
      },
      author: {
        connect: {
          id: createdBy
        }
      },
      space: {
        connect: {
          id: spaceId
        }
      },
      path: getPostPath(title)
    }
  });

  return createdPost;
}

export async function trackCreateForumPostEvent({ post, userId }: { post: Post; userId: string }) {
  const category = await prisma.postCategory.findUnique({
    where: {
      id: post.categoryId
    },
    select: {
      name: true
    }
  });

  if (category) {
    trackUserAction('create_a_post', {
      categoryName: category.name,
      resourceId: post.id,
      spaceId: post.spaceId,
      userId,
      hasImage: post.content
        ? findChildren(getNodeFromJson(post.content), (node) => node.type.name === 'image', true)?.length !== 0
        : false
    });
  }
}
