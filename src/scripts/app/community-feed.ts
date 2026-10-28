import { formatComments, formatDate, formatReactions } from '../../lib/format';
import type { CommunityPost } from '../../types/app';
import { requireElement, setText } from '../dom';

/** Fills a cloned CommunityPost template (components/app/community/CommunityPost.astro). */
export function fillCommunityPost(root: ParentNode, post: CommunityPost): void {
  const { displayName } = post.author;
  const time = requireElement<HTMLTimeElement>(root, '[data-post-time]');

  setText(root, '[data-post-avatar]', displayName.charAt(0).toLocaleUpperCase('pt-BR'));
  setText(root, '[data-post-author]', displayName);
  time.dateTime = new Date(post.createdAt).toISOString();
  time.textContent = formatDate(post.createdAt);
  setText(root, '[data-post-body]', post.body);
  setText(root, '[data-post-reactions]', formatReactions(post.reactions));
  setText(root, '[data-post-comments]', formatComments(post.commentCount));
}
