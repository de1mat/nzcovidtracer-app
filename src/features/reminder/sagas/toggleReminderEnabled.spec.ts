import { expectSaga } from "redux-saga-test-plan";
import { select } from "redux-saga-test-plan/matchers";

import { toggleIsRemindersEnabled } from "../commonActions";
import { rescheduleReminders as rescheduleAction } from "../commonActions";
import {
  dismissInAppReminder,
  setScheduledInAppReminders,
  toggleRemindersEnabled as toggleAction,
} from "../reducer";
import { selectIsEnabled } from "../selectors";
import { cancelReminders } from "../service/cancelReminders";
import { toggleRemindersEnabled } from "./toggleReminderEnabled";

jest.mock("../service/cancelReminders");

describe("#toggleReminderEnabled", () => {
  it("cancels local notifications and dismisses and unschedules in app reminders", async () => {
    await expectSaga(toggleRemindersEnabled)
      .put(toggleAction())
      .provide([[select(selectIsEnabled), false]])
      .call(cancelReminders)
      .put(setScheduledInAppReminders([]))
      .put(dismissInAppReminder())
      .dispatch(toggleIsRemindersEnabled)
      .silentRun();
  });
  it("reschedules notifications and in app reminders", async () => {
    await expectSaga(toggleRemindersEnabled)
      .put(toggleAction())
      .provide([[select(selectIsEnabled), true]])
      .put(rescheduleAction())
      .dispatch(toggleIsRemindersEnabled)
      .silentRun();
  });
});
