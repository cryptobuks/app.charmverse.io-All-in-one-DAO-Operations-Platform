import type { Page, Prisma, SpaceRoleToRole } from '@prisma/client';

import { prisma } from 'db';
import type { PagePermissionMeta } from 'lib/permissions/interfaces';

import type { IPageWithPermissions } from '../interfaces';

type PermissionsSelect = Record<keyof PagePermissionMeta, true>;
type PageFieldsWithoutContent = Record<keyof Omit<Page, 'content' | 'contentText' | 'version' | 'postId'>, true>;

type PagesRequest = {
  spaceId: string;
  userId?: string;
  archived?: boolean;
  pageIds?: string[];
  meta?: boolean;
  search?: string;
};

/**
 * Utility for getting permissions of a page
 * @returns
 */
export function includePagePermissions(): Prisma.PageInclude & {
  permissions: {
    include: {
      sourcePermission: true;
    };
  };
} {
  return {
    permissions: {
      include: {
        sourcePermission: true
      }
    }
  };
}

export function includePagePermissionsMeta(): { permissions: { select: PermissionsSelect } } {
  return {
    permissions: {
      select: {
        pageId: true,
        userId: true,
        id: true,
        permissionLevel: true,
        permissions: true,
        roleId: true,
        spaceId: true,
        public: true
      }
    }
  };
}

function selectPageFields(meta: boolean) {
  if (!meta) {
    return {
      include: includePagePermissions()
    };
  }

  const select: { select: PageFieldsWithoutContent } = {
    select: {
      id: true,
      deletedAt: true,
      createdAt: true,
      createdBy: true,
      updatedAt: true,
      updatedBy: true,
      title: true,
      headerImage: true,
      icon: true,
      path: true,
      isTemplate: true,
      parentId: true,
      spaceId: true,
      type: true,
      boardId: true,
      autoGenerated: true,
      index: true,
      cardId: true,
      proposalId: true,
      snapshotProposalId: true,
      fullWidth: true,
      bountyId: true,
      hasContent: true,
      galleryImage: true,
      ...includePagePermissionsMeta()
    }
  };

  return select;
}

export function accessiblePagesByPermissionsQuery({
  spaceId,
  userId
}: {
  spaceId: string;
  userId: string;
}): Prisma.PagePermissionListRelationFilter {
  return {
    some: {
      OR: [
        {
          role: {
            spaceRolesToRole: {
              some: {
                spaceRole: {
                  userId,
                  spaceId
                }
              }
            }
          }
        },
        {
          userId
        },
        {
          space: {
            spaceRoles: {
              some: {
                userId,
                spaceId
              }
            }
          }
        },
        {
          public: true
        }
      ]
    }
  };
}

export function generateAccessiblePagesQuery(input: PagesRequest): Prisma.PageFindManyArgs {
  const { spaceId, userId, archived = false, meta = false, search } = input;

  // Return only pages with public permissions
  if (!userId) {
    return {
      where: {
        spaceId,
        permissions: {
          some: {
            public: true
          }
        }
      }
    };
  }

  const archivedQuery = archived
    ? {
        deletedAt: {
          not: null
        }
      }
    : {
        deletedAt: null
      };

  const formattedSearch = search
    ? `${search
        .split(/\s/)
        .filter((s) => s)
        .join(' & ')}:*`
    : undefined;

  const searchQuery = search
    ? {
        title: { search: formattedSearch },
        contentText: { search: formattedSearch }
      }
    : {};

  return {
    where: {
      OR: [
        {
          spaceId,
          permissions: accessiblePagesByPermissionsQuery({
            spaceId,
            userId
          })
        },
        // Override for proposal templates so any user can instantiate them
        {
          type: 'proposal_template',
          space: {
            id: spaceId,
            spaceRoles: {
              some: {
                userId
              }
            }
          }
        },
        // Admin override to always return all pages
        {
          space: {
            id: spaceId,
            spaceRoles: {
              some: {
                userId,
                isAdmin: true
              }
            }
          }
        }
      ],
      ...archivedQuery,
      ...searchQuery
    },
    ...selectPageFields(meta || false)
  };
}

export async function getAccessiblePages(input: PagesRequest): Promise<IPageWithPermissions[]> {
  const spaceRole = await prisma.spaceRole.findFirst({
    where: {
      userId: input.userId,
      spaceId: input.spaceId
    }
  });

  // Not a space member, make userId undefined
  if (!spaceRole) {
    input.userId = undefined;
  }

  const availableRoles: { id: string; spaceRolesToRole: SpaceRoleToRole[] }[] =
    input.userId && spaceRole
      ? await prisma.role.findMany({
          where: {
            spaceId: input.spaceId,
            spaceRolesToRole: {
              some: {
                spaceRole: {
                  userId: input.userId
                }
              }
            }
          },
          select: {
            id: true,
            spaceRolesToRole: true
          }
        })
      : [];

  const formattedSearch = input.search
    ? `${input.search
        .split(/\s/)
        .filter((s) => s)
        .join(' & ')}:*`
    : undefined;

  const searchQuery = input.search
    ? {
        title: { search: formattedSearch },
        contentText: { search: formattedSearch }
      }
    : {};

  const pages = (await prisma.page.findMany({
    where: {
      spaceId: input.spaceId,
      deletedAt: input.archived ? { not: null } : null,
      ...searchQuery
    },
    ...selectPageFields(input.meta || false)
  } as any)) as IPageWithPermissions[];

  if (spaceRole?.isAdmin) {
    return pages as IPageWithPermissions[];
  }

  const filteredPages = pages.filter((page) => {
    if (spaceRole && page.type === 'proposal_template') {
      return true;
    }

    return page.permissions.some((permission) => {
      if (permission.public) {
        return true;
      } else if (input.userId) {
        return (
          permission.userId === input.userId ||
          (permission.roleId &&
            spaceRole &&
            availableRoles.some((r) =>
              r.spaceRolesToRole.some((s) => s.spaceRoleId === spaceRole.id && r.id === permission.roleId)
            )) ||
          permission.spaceId === input.spaceId
        );
      } else {
        return false;
      }
    });
  });

  return filteredPages as IPageWithPermissions[];
}
