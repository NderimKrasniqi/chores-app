export type PushRegistrationFailureStage =
  | 'setup'
  | 'missing_project_id'
  | 'token_acquisition'
  | 'backend_registration'
  | 'token_refresh';

export function reportPushRegistrationFailure(
  stage:
    PushRegistrationFailureStage,
) {
  /*
   * Intentionally do not accept the raw
   * exception, Push token, auth identity,
   * Child, or Household information.
   *
   * This keeps diagnostics useful without
   * risking sensitive values leaking into
   * logs or future telemetry transports.
   */
  if (__DEV__) {
    console.warn(
      '[push-registration]',
      {
        stage,
      },
    );
  }
}
