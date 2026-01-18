import { VueRenderer } from '@tiptap/vue-3';
import type { SuggestionOptions } from '@tiptap/suggestion';

import MentionList from '../../components/MentionList.vue';
import { searchMentions } from '../../services/users';
import { resolveFileUrl } from '../files';
import type { MentionItem } from './mentionTypes';

const mentionSuggestion: Omit<SuggestionOptions<MentionItem>, 'editor'> = {
  char: '@',
  allowSpaces: false,
  items: async ({ query }) => {
    const keyword = query.trim();
    if (!keyword) {
      return [];
    }
    try {
      const results = await searchMentions(keyword, 10);
      return results.map((user) => ({
        id: String(user.userId),
        label: user.handle,
        handle: user.handle,
        displayName: user.displayName,
        profileImageUrl: resolveFileUrl(user.profileImage?.storageKey),
      }));
    } catch {
      return [];
    }
  },
  render: () => {
    let component: VueRenderer | null = null;
    let popup: HTMLDivElement | null = null;

    const updatePosition = (clientRect?: (() => DOMRect | null) | null) => {
      if (!popup || !clientRect) {
        return;
      }
      const rect = clientRect();
      if (!rect) {
        return;
      }
      popup.style.left = `${rect.left + window.scrollX}px`;
      popup.style.top = `${rect.bottom + window.scrollY + 6}px`;
    };

    return {
      onStart: (props) => {
        component = new VueRenderer(MentionList, {
          props,
          editor: props.editor,
        });
        popup = document.createElement('div');
        popup.style.position = 'absolute';
        popup.style.zIndex = '9999';
        if (component.element) {
          popup.appendChild(component.element);
        }
        document.body.appendChild(popup);
        updatePosition(props.clientRect);
      },
      onUpdate: (props) => {
        component?.updateProps(props);
        updatePosition(props.clientRect);
      },
      onKeyDown: (props) => {
        if (component?.ref?.onKeyDown) {
          return component.ref.onKeyDown(props.event);
        }
        return false;
      },
      onExit: () => {
        popup?.remove();
        component?.destroy();
      },
    };
  },
};

export { mentionSuggestion };
