// Index for the Design page (/design). It only links out to pages that already
// exist in the prototype versions and the Jira design reference pages. It holds
// no screens of its own.
//
// Add a variant when a version or Jira design page changes a screen. Keep
// variants newest first. Say what made it different from the others, in a
// sentence or two, so it can be found quickly in a meeting.
//
// variant fields:
//   label         Short name, for example "Version 5" or "DWTA-456 design"
//   source        "Prototype" or "Jira design"
//   href          A page that works on first visit (no session data needed)
//   linkNote      Optional. Says how to reach the screen if href is not the screen itself
//   difference    What made this variant different
//   rationaleHref Optional. The version page, or Jira ticket page, that says why
//
// Wording marked TO CONFIRM was not recorded on the version pages. Check it.

module.exports = [
  {
    label: 'Version 9',
    source: 'Prototype',
    href: '/v9/software-providers',
    linkNote: 'Select a client name.',
    difference: 'A copy of version 7 with the developers’ URL pattern: /software-providers/{clientId}, with actions as subpaths such as /delete. No change to the screens.',
    rationaleHref: '/versions/v9'
  },
  {
    id: 'home',
    name: 'Home',
    summary: 'The landing page after the start of the service.',
    variants: [
      {
        label: 'Case file concept',
        source: 'Prototype',
        href: '/future/case-files/start',
        difference: 'Future-state concept. A search box for case files, and links to software packages by status with a count for each. The header shows who is signed in.',
        rationaleHref: '/versions/future-case-files'
      },
      {
        label: 'Version 5',
        source: 'Prototype',
        href: '/v5/start',
        difference: 'Heading is “DWT admin portal”, with a paragraph about the tools for the service team. The links to other pages are removed, because the navigation does that.',
        rationaleHref: '/versions/v5'
      },
      {
        label: 'DWTA-455 design',
        source: 'Jira design',
        href: '/jira-tickets/dwta-455/design',
        difference: 'The design reference for the version 5 home page and Defra branding.',
        rationaleHref: '/jira-tickets/dwta-455'
      },
      {
        label: 'Versions 4 to 4.4',
        source: 'Prototype',
        href: '/v4-4/start',
        difference: 'Heading is “Waste management admin portal”, with two links: Manage software providers and Report on waste organisations. Copied from version 3.',
        rationaleHref: '/versions/v4'
      },
      {
        label: 'Version 3',
        source: 'Prototype',
        href: '/v3/start',
        difference: 'Same as version 4. Service metrics link removed.',
        rationaleHref: '/versions/v3'
      },
      {
        label: 'Versions 1 and 2',
        source: 'Prototype',
        href: '/v2/start',
        difference: 'Three links: Find a PAT submission, Report on waste organisations and View service metrics. Version 2 uses the Defra header and adds Home to the navigation.',
        rationaleHref: '/versions/v2'
      }
    ]
  },
  {
    id: 'software-providers-list',
    name: 'Software providers list',
    summary: 'The page you reach from “Software providers” in the navigation.',
    variants: [
      {
        label: 'Version 10',
        source: 'Prototype',
        href: '/v10/software-providers',
        difference: 'For user research. The environment tag is in the header and the link to the other environment is under a “Change environment” heading. 50 External test and 30 Production clients, with client names that often differ between the environments.',
        rationaleHref: '/versions/v10'
      },
      {
        label: 'Case file concept',
        source: 'Prototype',
        href: '/future/case-files/software-providers',
        difference: 'Future-state concept. One row for each software package, with the software provider, its reference, status, days in that status and key contact. A search box and a status filter (MoJ filter) beside the table. “Create a case file” replaces “Create new credentials”.',
        rationaleHref: '/versions/future-case-files'
      },
      {
        label: 'DWTSPI-512 design',
        source: 'Jira design',
        href: '/jira-tickets/dwtspi-512/design',
        difference: 'The table in the software provider page concept with a 67-character client name in Production. The Client name column is half the table width on tablet and wider screens, and the client name and client ID wrap instead of making the page scroll sideways.',
        rationaleHref: '/jira-tickets/dwtspi-512'
      },
      {
        label: 'DWTSPI-469 deleted design',
        source: 'Jira design',
        href: '/jira-tickets/dwtspi-469/design-deleted',
        difference: 'The table after a software provider is deleted, with a MoJ success alert above the heading: “Software provider deleted” and “[Client name] has been deleted.”',
        rationaleHref: '/jira-tickets/dwtspi-469'
      },
      {
        label: 'Software provider page ticket design',
        source: 'Jira design',
        href: '/jira-tickets/dwtspi-496/design',
        difference: 'The DWTA-456 table with each client name as a link to the software provider page. The Client secret column from DWTA-466 is removed. Shows External test as an example.',
        rationaleHref: '/jira-tickets/dwtspi-496'
      },
      {
        label: 'DWTA-466 design',
        source: 'Jira design',
        href: '/jira-tickets/dwta-466/design',
        difference: 'DWTA-458 table plus a Client secret column. Each row has a Manage link. Shows External test as an example.',
        rationaleHref: '/jira-tickets/dwta-466'
      },
      {
        label: 'DWTA-458 design',
        source: 'Jira design',
        href: '/jira-tickets/dwta-458/design',
        difference: 'DWTA-456 table plus a secondary Create new credentials button between the text and the table. Shows External test as an example.',
        rationaleHref: '/jira-tickets/dwta-458'
      },
      {
        label: 'Version 6',
        source: 'Prototype',
        href: '/v6/software-providers',
        difference: 'The Client secret column is removed. Each client name is a link to the Manage client credentials page. Client ID and Environment are unchanged.',
        rationaleHref: '/versions/v6'
      },
      {
        label: 'Version 5',
        source: 'Prototype',
        href: '/v5/software-providers',
        difference: 'One table with Client name, Client ID, Environment and Client secret (a Manage link in each row). Production is hidden and every row says External test. Sortable, and loads sorted by Client name from A to Z. The Create new credentials button stays above the table.',
        rationaleHref: '/versions/v5'
      },
      {
        label: 'Version 4.4',
        source: 'Prototype',
        href: '/v4-4/software-providers/test',
        difference: 'Same as version 4.3 and 4.2: separate Test and Production pages. Client name, Client ID, Client secret and Last changed columns.',
        rationaleHref: '/versions/v4-4'
      },
      {
        label: 'Version 4.2',
        source: 'Prototype',
        href: '/v4-2/software-providers/test',
        difference: 'Software provider column removed and Last changed added. Each client name has an Edit link. Versions 4.3 and 4.4 are copies of this.',
        rationaleHref: '/versions/v4-2'
      },
      {
        label: 'Separate URLs design',
        source: 'Jira design',
        href: '/jira-tickets/separate-credential-urls/test',
        difference: 'Design reference for separate Test and Production pages. Out of scope for DWTA-456.',
        rationaleHref: '/jira-tickets/separate-credential-urls'
      },
      {
        label: 'Last changed column design',
        source: 'Jira design',
        href: '/jira-tickets/last-changed-column/design',
        difference: 'DWTA-456 table plus a Last changed column, sorted most recent first. Out of scope for DWTA-456.',
        rationaleHref: '/jira-tickets/last-changed-column'
      },
      {
        label: 'DWTA-456 empty state design',
        source: 'Jira design',
        href: '/jira-tickets/dwta-456/design-empty',
        difference: 'No table. A “Client credentials” heading and the text “New client credentials will be shown here.” Shows External test as an example.',
        rationaleHref: '/jira-tickets/dwta-456'
      },
      {
        label: 'DWTA-456 design',
        source: 'Jira design',
        href: '/jira-tickets/dwta-456/design',
        difference: 'One page that shows the credentials for the environment the user is in (Dev, Test, Performance test, External test or Production). Shows External test as an example. Client name, Client ID and Environment. Sortable, and sorted by Client name from A to Z.',
        rationaleHref: '/jira-tickets/dwta-456'
      },
      {
        label: 'DWTA-456 Production credentials empty state design (out of date)',
        source: 'Jira design',
        href: '/jira-tickets/dwta-456/design-empty-production',
        difference: 'Out of date, not to be used. Separate Production page, empty state.',
        rationaleHref: '/jira-tickets/dwta-456'
      },
      {
        label: 'DWTA-456 Test credentials empty state design (out of date)',
        source: 'Jira design',
        href: '/jira-tickets/dwta-456/design-empty-test',
        difference: 'Out of date, not to be used. Separate Test page, empty state.',
        rationaleHref: '/jira-tickets/dwta-456'
      },
      {
        label: 'DWTA-456 Production credentials design (out of date)',
        source: 'Jira design',
        href: '/jira-tickets/dwta-456/design-production',
        difference: 'Out of date, not to be used. Separate Production page.',
        rationaleHref: '/jira-tickets/dwta-456'
      },
      {
        label: 'DWTA-456 Test credentials design (out of date)',
        source: 'Jira design',
        href: '/jira-tickets/dwta-456/design-test',
        difference: 'Out of date, not to be used. Separate Test page.',
        rationaleHref: '/jira-tickets/dwta-456'
      },
      {
        label: 'Version 4.1',
        source: 'Prototype',
        href: '/v4-1/software-providers/test',
        difference: 'Test and Production on separate pages, switched with a sub navigation. Software provider and Client name columns. No Environment column.',
        rationaleHref: '/versions/v4-1'
      },
      {
        label: 'Version 4',
        source: 'Prototype',
        href: '/v4/software-providers',
        difference: 'One table of client credentials for both environments, with Software provider, Client name, Client ID, Client secret and Environment. Client secret shows only a Rotate link. Sortable.',
        rationaleHref: '/versions/v4'
      },
      {
        label: 'Version 3',
        source: 'Prototype',
        href: '/v3/software-providers',
        difference: 'A list of software provider companies, with test and production client IDs and a created date, and an “Add a software provider” button. Empty state on first visit.',
        rationaleHref: '/versions/v3'
      },
      {
        label: 'Versions 1 and 2',
        source: 'Prototype',
        href: '/v2/software-providers',
        difference: 'The PAT submission viewer, not a credentials list. Version 2 shows all submissions from the start with a Submission ID filter and 25 rows per page. TO CONFIRM: version 1 shows results only after a search.',
        rationaleHref: '/versions/v2'
      }
    ]
  },
  {
    id: 'software-provider-detail',
    name: 'Software provider detail',
    summary: 'A single software provider company, with its email addresses and notes. Built in version 3, and as a case file in the case file concept.',
    variants: [
      {
        label: 'Version 10 (Production)',
        source: 'Prototype',
        href: '/v10/software-providers/production',
        linkNote: 'Select a client name.',
        difference: 'The first Production software provider page. The same as External test, with the Production tag in the header and “Client secrets for production environment”.',
        rationaleHref: '/versions/v10'
      },
      {
        label: 'Case file concept',
        source: 'Prototype',
        href: '/future/case-files/software-providers/sp-1001',
        difference: 'Future-state concept. A case file with three pages: Overview, Contacts and History (MoJ sub navigation), with the name and reference at the top of each (MoJ identity bar). Software packages are summary cards with their status. History is a timeline of every action, with who did it and why.',
        rationaleHref: '/versions/future-case-files'
      },
      {
        label: 'Version 3',
        source: 'Prototype',
        href: '/v3/software-providers/example-greenlane',
        difference: 'Company name and email addresses in a summary list, both editable. Notes in a timeline, not editable. Test and Production API keys managed from this page. Example data, so no setup needed.',
        rationaleHref: '/versions/v3'
      },
      {
        label: 'Version 4',
        source: 'Prototype',
        href: '/v4/software-providers/example-greenlane',
        linkNote: 'Still in version 4, but nothing links to it. Not included in versions 4.1 onwards.',
        difference: 'A copy of the version 3 page.',
        rationaleHref: '/versions/v4'
      }
    ]
  },
  {
    id: 'add-software-provider',
    name: 'Add a software provider',
    summary: 'Adding a company to the list. Built in version 3, and as “Create a case file” in the case file concept.',
    variants: [
      {
        label: 'Case file concept',
        source: 'Prototype',
        href: '/future/case-files/software-providers/create?new=yes',
        linkNote: 'Enter “Greenlane Digital” to see the similar names page.',
        difference: 'Future-state concept, called “Create a case file”. Organisation name, a check for case files with a similar name, organisation details, key contact, how the contact was checked, then check your answers.',
        rationaleHref: '/versions/future-case-files'
      },
      {
        label: 'Version 3',
        source: 'Prototype',
        href: '/v3/software-providers/add',
        difference: 'Company name, up to five email addresses using the MoJ “Add another” pattern, and notes that are date stamped and cannot be edited. Save and Cancel. No confirmation page. The new company appears at the top of the list.',
        rationaleHref: '/versions/v3'
      }
    ]
  },
  {
    id: 'create-credentials',
    name: 'Create and edit credentials',
    summary: 'The question page for the client name, reached from the Create credentials button.',
    variants: [
      {
        label: 'Case file concept',
        source: 'Prototype',
        href: '/future/case-files/software-providers/sp-1003/packages/sp-1003-p1/credentials/production/create',
        difference: 'Future-state concept. No client name question: the service makes the client name. The page asks which checked contact to send the client secret to, then has a check page. The environment comes from the button on the software package page.',
        rationaleHref: '/versions/future-case-files'
      },
      {
        label: 'DWTSPI-493 edit client name error design',
        source: 'Jira design',
        href: '/jira-tickets/dwtspi-493/design-edit',
        difference: 'The edit page with a MoJ error alert: “Sorry, there is a problem with the service” and “Try again. We have not changed the client name.”',
        rationaleHref: '/jira-tickets/dwtspi-493'
      },
      {
        label: 'DWTSPI-493 generate credentials error design',
        source: 'Jira design',
        href: '/jira-tickets/dwtspi-493/design-generate',
        difference: 'The create page with a MoJ error alert: “Sorry, there is a problem with the service” and “Try again. We have not created client credentials.”',
        rationaleHref: '/jira-tickets/dwtspi-493'
      },
      {
        label: 'DWTSPI-502 edit client name design',
        source: 'Jira design',
        href: '/jira-tickets/dwtspi-502/design-edit',
        difference: 'The create page used to edit the name. No caption, heading “Edit client name”, the current name filled in, no full stop at the end of the example, and the button “Save”.',
        rationaleHref: '/jira-tickets/dwtspi-502'
      },
      {
        label: 'Allowed characters invalid characters error design',
        source: 'Jira design',
        href: '/jira-tickets/allowed-characters/design-name-error-characters',
        difference: 'The name page with an error: “Client name must only include letters, numbers, underscores, hyphens and full stops”. Out of scope for DWTA-458.',
        rationaleHref: '/jira-tickets/allowed-characters'
      },
      {
        label: 'Allowed characters name page design',
        source: 'Jira design',
        href: '/jira-tickets/allowed-characters/design-name',
        difference: 'The name page with a paragraph above the input saying which characters are allowed (letters, numbers, underscores, hyphens and full stops), and an example in the hint. Out of scope for DWTA-458.',
        rationaleHref: '/jira-tickets/allowed-characters'
      },
      {
        label: 'DWTA-458 name page duplicate name error design',
        source: 'Jira design',
        href: '/jira-tickets/dwta-458/design-name-error-duplicate',
        difference: 'The name page with an error: “A client with this name already exists. Enter a different client name”. Page title starts with “Error: ”.',
        rationaleHref: '/jira-tickets/dwta-458'
      },
      {
        label: 'DWTA-458 name page letters and underscores error design',
        source: 'Jira design',
        href: '/jira-tickets/dwta-458/design-name-error-characters',
        difference: 'The name page with an error: “Client name must only include letters and underscores”. Page title starts with “Error: ”.',
        rationaleHref: '/jira-tickets/dwta-458'
      },
      {
        label: 'DWTA-458 name page empty name error design',
        source: 'Jira design',
        href: '/jira-tickets/dwta-458/design-name-error',
        difference: 'The name page with an error summary and the error “Enter a client name”. Page title starts with “Error: ”.',
        rationaleHref: '/jira-tickets/dwta-458'
      },
      {
        label: 'DWTA-458 name page design',
        source: 'Jira design',
        href: '/jira-tickets/dwta-458/design-name',
        difference: 'Heading is “What is the name of the software provider and package?”, with the caption “Create external test environment credentials”. One input labelled Client name.',
        rationaleHref: '/jira-tickets/dwta-458'
      },
      {
        label: 'Version 5',
        source: 'Prototype',
        href: '/v5/software-providers',
        linkNote: 'Select Create new credentials.',
        difference: 'Caption names the task and environment, for example “Create external test environment credentials”. Heading is “What is the name of the software provider and package?”, with new help text. Page title is the question, and starts with “Error: ” on an error page.',
        rationaleHref: '/versions/v5'
      },
      {
        label: 'Version 4.4',
        source: 'Prototype',
        href: '/v4-4/software-providers/test',
        linkNote: 'Select Create new credentials.',
        difference: 'Captions now name the task and environment. Same question and heading as version 4.3.',
        rationaleHref: '/versions/v4-4'
      },
      {
        label: 'Version 4.3',
        source: 'Prototype',
        href: '/v4-3/software-providers/test',
        linkNote: 'Select Create new credentials.',
        difference: 'Heading is “What is the name of the software provider and application?”, with a caption showing the environment. TO CONFIRM: the change from version 4.2 is not recorded on the version page.',
        rationaleHref: '/versions/v4-3'
      },
      {
        label: 'Version 4.2',
        source: 'Prototype',
        href: '/v4-2/software-providers/test',
        linkNote: 'Select Create new credentials, or Edit in the table.',
        difference: 'One question, “What is the client name?”, with the software provider name folded in. Edit reuses the same page with the name filled in.',
        rationaleHref: '/versions/v4-2'
      },
      {
        label: 'Version 4.1',
        source: 'Prototype',
        href: '/v4-1/software-providers/test',
        linkNote: 'Select Create new credentials.',
        difference: 'Software provider name and client name fields. Environment is set from the page you started on, and shown in the heading.',
        rationaleHref: '/versions/v4-1'
      },
      {
        label: 'Version 4',
        source: 'Prototype',
        href: '/v4/client-credentials/create',
        difference: 'Software provider name, client name and an Environment question (Test or Production), all on one page.',
        rationaleHref: '/versions/v4'
      }
    ]
  },
  {
    id: 'credentials-created',
    name: 'Client secret created',
    summary: 'Shown once, after credentials are created or a secret is rotated. Needs session data, so these links open the list.',
    variants: [
      {
        label: 'Case file concept',
        source: 'Prototype',
        href: '/future/case-files/software-providers/sp-1001/packages/sp-1001-p1',
        difference: 'Future-state concept. There is no page that shows the secret. The service sends it to a checked contact, and the software package page records when it was generated, who it was sent to and who sent it.',
        rationaleHref: '/versions/future-case-files'
      },
      {
        label: 'Copy credentials page ticket design',
        source: 'Jira design',
        href: '/jira-tickets/copy-credentials-page/design',
        difference: 'The version 6 copy page: the client name as the caption, one MoJ warning alert, the credentials in a summary list, and a primary Copy credentials button beside a secondary Close button. Only the new secret is shown.',
        rationaleHref: '/jira-tickets/copy-credentials-page'
      },
      {
        label: 'DWTA-466 page shown after adding a secret',
        source: 'Jira design',
        href: '/jira-tickets/dwta-466/design-add',
        difference: 'The DWTA-458 credentials page, with the existing secret in a second panel below the Copy button, redacted.',
        rationaleHref: '/jira-tickets/dwta-466'
      },
      {
        label: 'DWTA-458 credentials page design',
        source: 'Jira design',
        href: '/jira-tickets/dwta-458/design-credentials',
        difference: 'Caption “Manage client credentials” and the heading “Copy the client credentials”. Warning text under the heading. One panel with Generated on first, then environment, client ID and secret. Copy, then Close.',
        rationaleHref: '/jira-tickets/dwta-458'
      },
      {
        label: 'Version 5',
        source: 'Prototype',
        href: '/v5/software-providers',
        linkNote: 'Select Create new credentials, then save.',
        difference: 'Heading is “Copy the client credentials”, with the caption “Manage client credentials” and the client name as an H2. Warning text under the heading is the only message. The panel starts with Generated on. Copy, then Close.',
        rationaleHref: '/versions/v5'
      },
      {
        label: 'Version 4.4',
        source: 'Prototype',
        href: '/v4-4/software-providers/test',
        linkNote: 'Select Create new credentials, then save.',
        difference: 'Captions say the task and environment, for example “Create test environment credentials”.',
        rationaleHref: '/versions/v4-4'
      },
      {
        label: 'Version 4.3',
        source: 'Prototype',
        href: '/v4-3/software-providers/test',
        linkNote: 'Select Create new credentials, then save.',
        difference: 'Heading is “Client secret successfully created”. The index card says all credentials are available to copy. TO CONFIRM: the change from version 4.2 is not recorded on the version page.',
        rationaleHref: '/versions/v4-3'
      },
      {
        label: 'Version 4.2',
        source: 'Prototype',
        href: '/v4-2/software-providers/test',
        linkNote: 'Select Create new credentials, then save.',
        difference: 'Heading is “Copy the client credentials”. Client ID and client secret are in one grey block with one Copy button.',
        rationaleHref: '/versions/v4-2'
      },
      {
        label: 'Version 4',
        source: 'Prototype',
        href: '/v4/client-credentials/create',
        linkNote: 'Complete the form to reach the next page.',
        difference: 'Heading is “Credentials created”. Client ID and client secret each have their own Copy button, with an MoJ information alert saying the secret is only shown once.',
        rationaleHref: '/versions/v4'
      }
    ]
  },
  {
    id: 'rotate-secret',
    name: 'Rotate client secret',
    summary: 'Reached from the Rotate link in the table.',
    variants: [
      {
        label: 'Case file concept',
        source: 'Prototype',
        href: '/future/case-files/software-providers/sp-1004/packages/sp-1004-p1/credentials/production/replace',
        difference: 'Future-state concept. One page asks why the secret is being replaced. Routine keeps the current secret until it is removed. Security breach stops it immediately. Then who to send the new secret to, and a check page.',
        rationaleHref: '/versions/future-case-files'
      },
      {
        label: 'DWTSPI-505 replace secret design',
        source: 'Jira design',
        href: '/jira-tickets/dwtspi-505/design-replace',
        difference: 'The replace confirmation card with an extra line: “If credentials have been exposed, email security.team@defra.gov.uk.” The address opens a pre-filled email.',
        rationaleHref: '/jira-tickets/dwtspi-505'
      },
      {
        label: 'DWTSPI-505 remove secret design',
        source: 'Jira design',
        href: '/jira-tickets/dwtspi-505/design-remove',
        difference: 'The remove confirmation card with the same extra line about exposed credentials and the pre-filled email link.',
        rationaleHref: '/jira-tickets/dwtspi-505'
      },
      {
        label: 'Software provider page concept',
        source: 'Prototype',
        href: '/future/software-provider-page/software-providers',
        linkNote: 'Select a client name.',
        difference: 'Concept for a technical discussion. Four sets of secrets on one page: receipt of waste software and collection of waste software, each with a test and a production environment. Each has its own client name, client ID and two secrets. The page heading is the software provider name. No External test tag. Grey overview column with a status for each type of software and email addresses. Notes in an MoJ timeline. Mocked data. Remove goes to a placeholder page.',
        rationaleHref: '/versions/future-software-provider-page'
      },
      {
        label: 'DWTSPI-493 software provider page error design',
        source: 'Jira design',
        href: '/jira-tickets/dwtspi-493/design-provider',
        difference: 'The software provider page with a MoJ error alert above the caption, for a failed add, replace, remove or delete. The design shows “Try again. We have not added a secret.”',
        rationaleHref: '/jira-tickets/dwtspi-493'
      },
      {
        label: 'DWTSPI-469 delete confirmation design',
        source: 'Jira design',
        href: '/jira-tickets/dwtspi-469/design-confirm',
        difference: 'A MoJ interruption card: “Are you sure you want to delete the software provider?” and “You will delete the entire record for [client name], including all the credentials, in [environment] only.”, with the button “Yes, delete software provider”.',
        rationaleHref: '/jira-tickets/dwtspi-469'
      },
      {
        label: 'DWTSPI-469 software provider page design',
        source: 'Jira design',
        href: '/jira-tickets/dwtspi-469/design-provider',
        difference: 'The software provider page with a “Delete software provider” link at the bottom.',
        rationaleHref: '/jira-tickets/dwtspi-469'
      },
      {
        label: 'DWTSPI-502 software provider page design',
        source: 'Jira design',
        href: '/jira-tickets/dwtspi-502/design-provider',
        difference: 'The software provider page with an “Edit” link on the same line as the heading.',
        rationaleHref: '/jira-tickets/dwtspi-502'
      },
      {
        label: 'Version 7',
        source: 'Prototype',
        href: '/v7/software-providers',
        linkNote: 'Select Create new credentials, save, then select Close.',
        difference: 'The version 6 software provider page with a Back link to the Software providers page. The Replace secret and Remove secret links no longer say “secret” twice to screen readers. Matches the software provider page ticket design.',
        rationaleHref: '/versions/v7'
      },
      {
        label: 'Software provider page ticket remove confirmation design',
        source: 'Jira design',
        href: '/jira-tickets/dwtspi-496/design-remove',
        difference: 'The DWTA-466 remove confirmation, with the link “Go back to software provider”.',
        rationaleHref: '/jira-tickets/dwtspi-496'
      },
      {
        label: 'Software provider page ticket replace confirmation design',
        source: 'Jira design',
        href: '/jira-tickets/dwtspi-496/design-replace',
        difference: 'The DWTA-466 replace confirmation, with the link “Go back to software provider”.',
        rationaleHref: '/jira-tickets/dwtspi-496'
      },
      {
        label: 'Software provider page ticket design, two secrets',
        source: 'Jira design',
        href: '/jira-tickets/dwtspi-496/design-provider-two',
        difference: 'As shown straight after adding a secret: a green “New” tag on the newest secret, “Remove secret” on the older one, and no Add another secret button.',
        rationaleHref: '/jira-tickets/dwtspi-496'
      },
      {
        label: 'Software provider page ticket design, one secret',
        source: 'Jira design',
        href: '/jira-tickets/dwtspi-496/design-provider',
        difference: 'Replaces the Manage client credentials page. Back link, caption “Software provider”, client name as the H1, environment tag, client ID, and a table of secrets shown as “[Hidden]” with a “Replace secret” link. Add another secret below the table.',
        rationaleHref: '/jira-tickets/dwtspi-496'
      },
      {
        label: 'DWTA-466 remove confirmation design',
        source: 'Jira design',
        href: '/jira-tickets/dwta-466/design-remove',
        difference: 'MoJ interruption card: “Are you sure you want to remove this secret?”. Removes the older of two secrets.',
        rationaleHref: '/jira-tickets/dwta-466'
      },
      {
        label: 'DWTA-466 replace confirmation design',
        source: 'Jira design',
        href: '/jira-tickets/dwta-466/design-replace',
        difference: 'MoJ interruption card: “Are you sure you want to replace the current secret?”. Replaces the only secret.',
        rationaleHref: '/jira-tickets/dwta-466'
      },
      {
        label: 'DWTA-466 Manage client credentials, two secrets',
        source: 'Jira design',
        href: '/jira-tickets/dwta-466/design-manage-two',
        difference: 'Two panels, newest first, each redacted. No Add another secret. The red button is Remove this secret.',
        rationaleHref: '/jira-tickets/dwta-466'
      },
      {
        label: 'DWTA-466 Manage client credentials, one secret',
        source: 'Jira design',
        href: '/jira-tickets/dwta-466/design-manage',
        difference: 'Client name as the heading. One redacted panel. Add another secret, Replace this secret and Cancel.',
        rationaleHref: '/jira-tickets/dwta-466'
      },
      {
        label: 'Version 5',
        source: 'Prototype',
        href: '/v5/software-providers',
        linkNote: 'Select Manage in the table.',
        difference: 'Now “Manage client credentials”, reached from Manage in the table. Client name as the heading and a redacted secret. Add another secret, Replace this secret (or Remove this secret with two secrets) and Cancel. Replace and Remove each have a confirmation page.',
        rationaleHref: '/versions/v5'
      },
      {
        label: 'Version 4.4',
        source: 'Prototype',
        href: '/v4-4/software-providers/test',
        linkNote: 'Select Rotate in the table.',
        difference: 'Heading changed to “Confirm that you want to rotate the client secret”. Includes the full rotate journey.',
        rationaleHref: '/versions/v4-4'
      },
      {
        label: 'Version 4.3',
        source: 'Prototype',
        href: '/v4-3/software-providers/test',
        linkNote: 'Select Rotate in the table.',
        difference: 'Rotate page headed “Client credentials”. TO CONFIRM: the change from version 4.2 is not recorded on the version page.',
        rationaleHref: '/versions/v4-3'
      },
      {
        label: 'Version 4.2',
        source: 'Prototype',
        href: '/v4-2/software-providers/test',
        linkNote: 'Select Rotate in the table.',
        difference: 'No confirmation. Rotate gives a new secret straight away and opens the “Copy the client credentials” page.',
        rationaleHref: '/versions/v4-2'
      },
      {
        label: 'Version 4',
        source: 'Prototype',
        href: '/v4/software-providers',
        linkNote: 'Select Rotate in the table.',
        difference: 'Rotate goes to a “not built” page.',
        rationaleHref: '/versions/v4'
      }
    ]
  },
  {
    id: 'software-package',
    name: 'Software package',
    summary: 'One software package on a case file, with its approval and credentials. Only built in the case file concept.',
    variants: [
      {
        label: 'Case file concept',
        source: 'Prototype',
        href: '/future/case-files/software-providers/sp-1002/packages/sp-1002-p1',
        difference: 'Status tag with days in that status, approval for production, and the credentials for external test and production on one page. A table of secrets shows when each was generated and who it was sent to. Links to suspend, revoke or move the software package.',
        rationaleHref: '/versions/future-case-files'
      }
    ]
  },
  {
    id: 'approve-for-production',
    name: 'Approve for production',
    summary: 'Recording the production approval test (PAT) result and approving a software package. Only built in the case file concept.',
    variants: [
      {
        label: 'Case file concept',
        source: 'Prototype',
        href: '/future/case-files/software-providers/sp-1008/packages/sp-1008-p1/pat-result',
        difference: 'Passed, Failed or Exception agreed, with details that are needed for an exception. “Approve for production” is offered after a pass or an exception, and shows what the approval is based on.',
        rationaleHref: '/versions/future-case-files'
      }
    ]
  },
  {
    id: 'access',
    name: 'Suspend, reactivate or revoke access',
    summary: 'Stopping or restoring a software package’s access. Only built in the case file concept.',
    variants: [
      {
        label: 'Case file concept',
        source: 'Prototype',
        href: '/future/case-files/software-providers/sp-1001/packages/sp-1001-p1/suspend',
        difference: 'One page each, with what will happen, the reason and a message to the software provider. Revoke has an “Are you sure?” page (MoJ interruption card).',
        rationaleHref: '/versions/future-case-files'
      }
    ]
  },
  {
    id: 'record-contact',
    name: 'Record a contact',
    summary: 'Recording a conversation with a software provider on its case file. Only built in the case file concept.',
    variants: [
      {
        label: 'Case file concept',
        source: 'Prototype',
        href: '/future/case-files/software-providers/sp-1001/record-contact',
        difference: 'One page: who the contact was with and whether they have been checked, how, what it was about and a summary. It is added to the history.',
        rationaleHref: '/versions/future-case-files'
      }
    ]
  },
  {
    id: 'contact-providers',
    name: 'Contact providers',
    summary: 'Contacting a group of software providers, for an incident or a mailshot. Only built in the case file concept.',
    variants: [
      {
        label: 'Case file concept',
        source: 'Prototype',
        href: '/future/case-files/contact-providers',
        difference: 'Choose software providers by the status of their software packages, check the contact list, download it as a CSV file, then record the message on every case file. The service does not send the message.',
        rationaleHref: '/versions/future-case-files'
      }
    ]
  },
  {
    id: 'audit',
    name: 'Audit',
    summary: 'Auditing a random sample of actions. Auditor only. Only built in the case file concept.',
    variants: [
      {
        label: 'Case file concept',
        source: 'Prototype',
        href: '/future/case-files/sign-in',
        linkNote: 'Sign in as the auditor, then select Audit.',
        difference: 'A random sample of 10 actions as a GOV.UK task list. Each action shows who did it, when and why, and is marked “No concerns” or “Needs follow-up”. Completing the audit records that it was done. “All actions” lists every action with filters.',
        rationaleHref: '/versions/future-case-files'
      }
    ]
  },
  {
    id: 'sign-in',
    name: 'Sign in with Microsoft Entra ID',
    summary: 'The landing page before sign in, and the page shown when sign in fails.',
    variants: [
      {
        label: 'DWTSPI-532: sign in page',
        source: 'Jira design',
        href: '/jira-tickets/dwtspi-532/design-sign-in',
        difference: 'Idea C, with the environment tag from DWTSPI-517 in the header and the green line instead of the navigation.',
        rationaleHref: '/jira-tickets/dwtspi-532'
      },
      {
        label: 'DWTSPI-532: error page',
        source: 'Jira design',
        href: '/jira-tickets/dwtspi-532/design-error',
        difference: 'One error page for every cause, with a button that goes straight back to the Microsoft sign in.',
        rationaleHref: '/jira-tickets/dwtspi-532'
      },
      {
        label: 'Version 9, idea C: error page',
        source: 'Prototype',
        href: '/v9/sign-in/c/error',
        difference: 'One error page for when sign in fails, with the green line under the header instead of the navigation.',
        rationaleHref: '/versions/v9'
      },
      {
        label: 'Version 9, idea C: landing page',
        source: 'Prototype',
        href: '/v9/sign-in/c',
        difference: 'The page every user sees until they have signed in. The heading is “Sign in to DWT admin portal”, then a short list of what the portal is for and one “Continue to sign in” button.',
        rationaleHref: '/versions/v9'
      },
      {
        label: 'Version 9, idea B: landing page',
        source: 'Prototype',
        href: '/v9/sign-in/b',
        difference: 'Says what you can do in the service, what to expect (a Microsoft page, then back here) and what to do if you cannot sign in.',
        rationaleHref: '/versions/v9'
      },
      {
        label: 'Version 9, idea A: landing page',
        source: 'Prototype',
        href: '/v9/sign-in',
        difference: 'A short GOV.UK start page: what the service is, who it is for and one sign in button.',
        rationaleHref: '/versions/v9'
      },
      {
        label: 'Version 9, idea B: errors',
        source: 'Prototype',
        href: '/v9/sign-in/error-b?reason=no-access',
        linkNote: 'Also reason=cancelled and reason=problem.',
        difference: 'A different page for no access, cancelled sign in and a technical problem, each with its own next step.',
        rationaleHref: '/versions/v9'
      },
      {
        label: 'Version 9, idea A: error',
        source: 'Prototype',
        href: '/v9/sign-in/error-a',
        difference: 'One generic “problem with signing in” page for every failure.',
        rationaleHref: '/versions/v9'
      }
    ]
  },
  {
    id: 'waste-organisations',
    name: 'Waste organisations report',
    summary: 'The report of waste organisations, filtered by date.',
    variants: [
      {
        label: 'DWTSPI-480 design',
        source: 'Jira design',
        href: '/jira-tickets/dwtspi-480/design',
        difference: 'The version 7 results table with the Payment year ending and Payment status columns removed, and a Local authority column (Yes, No or Not known) added after Organisation name and ID.',
        rationaleHref: '/jira-tickets/dwtspi-480'
      },
      {
        label: 'Version 7',
        source: 'Prototype',
        href: '/v7/regulators',
        difference: 'No table until the user enters a valid from and to date and selects Show organisations. Validation errors for blank, partial, invalid, future and reversed dates. Heading names the date range, then a count with a download CSV link above the table. All rows on one page with sortable columns (MoJ sortable table). Organisation name is the first column and row header, Payment status the last. Payment period reads “Oct to Sep 25”. Navigation item is called Waste organisations.',
        rationaleHref: '/versions/v7'
      },
      {
        label: 'Version 5',
        source: 'Prototype',
        href: '/v5/regulators',
        difference: 'Copy of version 4.4. Navigation item is called Reporting. TO CONFIRM: whether the report page itself changed.',
        rationaleHref: '/versions/v5'
      },
      {
        label: 'Versions 3 to 4.4',
        source: 'Prototype',
        href: '/v4-4/regulators',
        difference: 'Same as version 2, copied forward.',
        rationaleHref: '/versions/v3'
      },
      {
        label: 'Version 2',
        source: 'Prototype',
        href: '/v2/regulators',
        difference: 'All organisations shown in a table from the start, with from and to date filters above it. 25 rows per page, using MoJ pagination.',
        rationaleHref: '/versions/v2'
      },
      {
        label: 'Version 1',
        source: 'Prototype',
        href: '/v1/regulators',
        difference: 'First version of the report. TO CONFIRM: what it showed before filtering.',
        rationaleHref: '/versions/v1'
      }
    ]
  }
]
