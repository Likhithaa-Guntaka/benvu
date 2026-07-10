import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';

import { handleChangeOrgType, handleOrgTypeSelected } from '../../../listeners/actions/onboarding-buttons.js';
import { sessionStore } from '../../../thread-context/index.js';

describe('onboarding action handlers', () => {
  let fakeAck;
  let fakeClient;
  let fakeContext;
  let fakeLogger;

  beforeEach(() => {
    fakeAck = mock.fn(async () => {});
    fakeClient = {
      conversations: { open: mock.fn(async () => ({ channel: { id: 'D1' } })) },
      chat: { postMessage: mock.fn(async () => ({ ok: true, ts: '1.1' })) },
      views: { publish: mock.fn(async () => ({ ok: true })), open: mock.fn(async () => ({ ok: true })) },
    };
    fakeContext = { botUserId: 'U0BOT', userToken: undefined };
    fakeLogger = { error: mock.fn(), info: mock.fn() };
  });

  describe('handleOrgTypeSelected', () => {
    it('stores the org type, sends a tailored DM, and refreshes the home tab', async () => {
      const body = { user: { id: 'UONBOARD' }, actions: [{ value: 'education' }] };
      await handleOrgTypeSelected({ ack: fakeAck, body, client: fakeClient, context: fakeContext, logger: fakeLogger });

      assert.strictEqual(fakeAck.mock.callCount(), 1);
      assert.strictEqual(sessionStore.getOrgType('UONBOARD'), 'education');

      // Follow-up DM with tailored prompt buttons.
      assert.strictEqual(fakeClient.chat.postMessage.mock.callCount(), 1);
      const dm = fakeClient.chat.postMessage.mock.calls[0].arguments[0];
      assert.strictEqual(dm.channel, 'D1');
      assert.ok(Array.isArray(dm.blocks));
      const promptBlock = dm.blocks.find((b) => b.block_id === 'tailored_prompts');
      assert.strictEqual(promptBlock.elements.length, 3);

      // Home tab refreshed for the same user.
      assert.strictEqual(fakeClient.views.publish.mock.callCount(), 1);
      const publish = fakeClient.views.publish.mock.calls[0].arguments[0];
      assert.strictEqual(publish.user_id, 'UONBOARD');
      assert.strictEqual(publish.view.type, 'home');
    });

    it('ignores an unknown org type', async () => {
      const body = { user: { id: 'UBAD' }, actions: [{ value: 'not_a_type' }] };
      await handleOrgTypeSelected({ ack: fakeAck, body, client: fakeClient, context: fakeContext, logger: fakeLogger });
      assert.strictEqual(sessionStore.getOrgType('UBAD'), null);
      assert.strictEqual(fakeClient.chat.postMessage.mock.callCount(), 0);
    });

    it('sends the DM once across repeated Change-org-type switches (regression)', async () => {
      // Models the real UI path that broke live: switching org type goes through
      // "Change organization type", which clears the org type to null before the
      // user re-picks. Only the first-ever selection should DM.
      const U = 'USWITCH';
      const select = (value) =>
        handleOrgTypeSelected({
          ack: fakeAck,
          body: { user: { id: U }, actions: [{ value }] },
          client: fakeClient,
          context: fakeContext,
          logger: fakeLogger,
        });
      const change = () =>
        handleChangeOrgType({
          ack: fakeAck,
          body: { user: { id: U } },
          client: fakeClient,
          context: fakeContext,
          logger: fakeLogger,
        });

      await select('food_bank'); // first onboarding -> DM
      await change(); // clears org type to null
      await select('mental_health'); // a change, NOT first onboarding -> no DM
      await change();
      await select('education'); // still a change -> no DM

      assert.strictEqual(sessionStore.getOrgType(U), 'education');
      assert.ok(sessionStore.hasOnboarded(U), 'user stays onboarded through changes');
      // Exactly one tailored DM across the whole sequence — the original intent.
      assert.strictEqual(fakeClient.chat.postMessage.mock.callCount(), 1);
      assert.strictEqual(
        fakeClient.chat.postMessage.mock.calls[0].arguments[0].text,
        'Set up for Food Bank / Basic Needs.',
      );
    });
  });

  describe('handleChangeOrgType', () => {
    it('clears the org type and republishes the Home tab', async () => {
      sessionStore.setOrgType('URESET', 'arts_culture');
      const body = { user: { id: 'URESET' } };

      await handleChangeOrgType({ ack: fakeAck, body, client: fakeClient, context: fakeContext, logger: fakeLogger });

      assert.strictEqual(fakeAck.mock.callCount(), 1);
      assert.strictEqual(sessionStore.getOrgType('URESET'), null);
      assert.strictEqual(fakeClient.views.publish.mock.callCount(), 1);
      const publish = fakeClient.views.publish.mock.calls[0].arguments[0];
      assert.strictEqual(publish.user_id, 'URESET');
      assert.strictEqual(publish.view.type, 'home');
    });
  });
});
