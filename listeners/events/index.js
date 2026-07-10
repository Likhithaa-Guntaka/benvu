import { handleAppHomeOpened } from './app-home-opened.js';
import { handleAppMentioned } from './app-mentioned.js';
import { handleAssistantThreadStarted } from './assistant-thread-started.js';
import { handleMessage } from './message.js';
import { handleReactionAdded } from './reaction-added.js';
import { handleTeamJoin } from './team-join.js';

/**
 * Register event listeners with the Bolt app.
 * @param {import('@slack/bolt').App} app
 * @returns {void}
 */
export function register(app) {
  app.event('app_home_opened', handleAppHomeOpened);
  app.event('app_mention', handleAppMentioned);
  app.event('assistant_thread_started', handleAssistantThreadStarted);
  app.event('message', handleMessage);
  app.event('reaction_added', handleReactionAdded);
  app.event('team_join', handleTeamJoin);
}
