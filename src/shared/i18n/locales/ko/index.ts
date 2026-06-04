import admin from './admin';
import article from './article';
import auth from './auth';
import board from './board';
import boardMeta from './boardMeta';
import comment from './comment';
import common from './common';
import community from './community';
import content from './content';
import editor from './editor';
import history from './history';
import home from './home';
import myPage from './myPage';
import nav from './nav';
import search from './search';
import notification from './notification';
import settings from './settings';
import topMenu from './topMenu';

const ko = {
  nav,
  common,
  notification,
  settings,
  topMenu,
  auth,
  home,
  search,
  myPage,
  history,
  content,
  editor,
  community,
  board,
  boardMeta,
  admin,
  article,
  comment,
} as const;

export default ko;
