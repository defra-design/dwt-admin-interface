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
    id: 'home',
    name: 'Home',
    summary: 'The landing page after the start of the service.',
    variants: [
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
    summary: 'A single software provider company, with its email addresses and notes. Only built in version 3.',
    variants: [
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
    summary: 'Adding a company to the list. Only built in version 3.',
    variants: [
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
    id: 'waste-organisations',
    name: 'Waste organisations report',
    summary: 'The report of waste organisations, filtered by date.',
    variants: [
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
