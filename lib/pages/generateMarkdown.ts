import { BangleEditorState } from '@bangle.dev/core';
import { markdownSerializer } from '@bangle.dev/markdown';
import { Node } from '@bangle.dev/pm';
import type { Page } from '@prisma/client';

import { replaceNestedPages } from 'components/common/CharmEditor/components/nestedPage';
import { specRegistry } from 'components/common/CharmEditor/specRegistry';
import type { PageContent } from 'lib/prosemirror/interfaces';

export async function generateMarkdown(page: Page, withTitle: boolean = false): Promise<string> {
  if (page) {
    const serializer = markdownSerializer(specRegistry);

    const state = new BangleEditorState({
      specRegistry,
      initialValue: page.content ? Node.fromJSON(specRegistry.schema, page.content as PageContent) : '',
      editorProps: {
        attributes: {
          example: 'value'
        }
      }
    });

    let markdown = serializer.serialize(state.pmState.doc);

    // Logic added here as the markdown serializer is synchronous
    markdown = await replaceNestedPages(markdown);

    if (page.title && withTitle) {
      const pageTitleAsMarkdown = `# ${page.title}`;

      markdown = `${pageTitleAsMarkdown}\r\n\r\n${markdown}`;
    }

    return markdown;
  }
  return '';
}
