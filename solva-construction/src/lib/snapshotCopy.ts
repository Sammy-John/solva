export const getSnapshotRestoreConfirmationMessage = ({
  label,
  createdAtLabel,
}: {
  label: string;
  createdAtLabel: string;
}): string =>
  `Restore snapshot "${label}" from ${createdAtLabel}? This will overwrite the active saved schedule for this project.`;
