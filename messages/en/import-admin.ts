export default {
  targetSchool: "Target School",
  selectSchoolPlaceholder: "Select a school",
  selectSchoolFirst: "Please select a target school before uploading",
  targetSchoolHint: "Data will be imported under the selected school",
  conflict: {
    title: "Resolve classroom conflicts",
    description:
      "{count, plural, one {# classroom name} other {# classroom names}} in your file already {count, plural, one {exists} other {exist}} in your school. Choose what to do for each.",
    applyToAllLabel: "Apply to all:",
    applyToAllExisting: "Use existing for all",
    applyToAllNew: "Create new for all",
    useExisting: "Use existing classroom",
    createNew: "Create new (with a suffix)",
    createNewHint: 'Will be created with a suffix like "{name} (2)"',
    cancel: "Cancel",
    confirm: "Confirm and import",
    allMustChoose: "Please choose an option for every classroom.",
  },
  result: {
    suffixedCreated: 'Created "{newName}" from your "{originalName}" row',
  },
} as const;
