# POS Patch Notes

These notes summarize application changes from `1.0.0` through the current build. The repository does not currently contain tags for every historical build, so early `1.0.x` and `1.1.x` notes are grouped from the accumulated project change history. Recent builds are listed individually where the exact version is known.

## 1.2.11

- Renamed the Receipt Builder button from Save Receipt Settings to Save Receipt Layout.

## 1.2.10

- Moved Reset Receipt inside the collapsed Receipt Builder body.
- Removed Save Printer Settings from the Business section and placed it with Printer Settings.
- Added an optional Additional Address control to Business settings.
- Additional Address can be toggled on and appears as an extra receipt address line when enabled.
- Kept the main Save Settings button at the bottom right of the Settings page outside User Account.

## 1.2.9

- Removed the floating behavior from the main Save Settings button.
- Moved the Save Settings status message back into the normal Settings page flow.
- Receipt Builder now opens collapsed by default.

## 1.2.8

- Moved Footer settings back into the Receipt Builder field list.
- Placed the Footer message text box below the Footer settings row.
- Kept Footer message editing grouped with the receipt builder instead of the top options area.

## 1.2.7

- Moved Footer receipt controls directly below the Footer message text box.
- Removed Footer from the main Receipt Builder field list so footer settings are grouped with the footer text.
- Kept Footer visibility, size, bold, and line settings saved in the receipt template.

## 1.2.6

- Removed the Logo size dropdown from Receipt Builder.
- Footer message now uses the full Receipt Builder options row.
- Receipt Builder keeps existing/default logo sizing internally without showing a user-facing control.

## 1.2.5

- Added Expand/Collapse control to the Receipt Builder inside Printer Settings.
- Added a dedicated Save Receipt Settings button for Receipt Builder changes.
- Changed Receipt Builder footer entry to a multi-line text box.
- Tightened Receipt Builder row layout so Size, Bold, and Line controls sit closer to each section description.

## 1.2.4

- Saved future Receipt Builder responsive stacking task in the README focus path.
- Hid Receipt Builder Move controls for now.
- Removed Left/Center/Right alignment controls from Receipt Builder rows for now.
- Simplified Receipt Builder rows so remaining controls fit more cleanly.

## 1.2.3

- Removed horizontal scrolling from the Live Receipt Preview.
- Receipt preview rows now wrap long labels and values instead of widening the preview pane.
- Live Receipt Preview now only scrolls vertically when receipt content exceeds the preview height.

## 1.2.2

- Updated Receipt Builder left-side section list to fit its rows without an internal vertical scrollbar.
- Widened Receipt Builder row controls so labels, alignment, size, Bold, and Line settings fit more cleanly.
- Receipt Builder now lets the Settings window/page handle vertical scrolling instead of the left list scrolling independently.

## 1.2.1

- Receipt Builder now keeps Business Name bold by default with divider line disabled.
- Receipt Builder now removes Bold and Line controls from Logo.
- Receipt Builder now keeps Business Address and Business Contact bold by default with divider lines disabled.
- Receipt Builder now hides Bold and Line controls from Business Address and Business Contact.
- Saved receipt templates are normalized so older templates inherit the corrected header styling automatically.

## 1.2.0

- Matched the Receipt Builder section list height to the Live Receipt Preview height.
- Removed Move controls from Business Name, Logo, and Address receipt sections so those header rows stay fixed.
- Removed Address and Contact labels from receipt preview, Complete Sale receipt, printed receipt, and WhatsApp receipt output.
- Version numbering rolled from `1.1.99` to `1.2.0`.

## 1.1.99

- Updated startup database backup defaults by detected database mode: Host PCs default off and Client PCs default on.
- Admin/Owner startup backup toggle choices are preserved after they manually change the setting.
- Added an Open Backup Location button to Database Mode.

## 1.1.98

- Added a Database Mode toggle for backing up the database on startup.
- Startup database backup is now off by default.
- Startup backup only runs when the admin/owner enables the Database Mode toggle.
- End-of-day database backup behavior remains available after report confirmation.

## 1.1.97

- Added a dedicated Save Printer Settings button inside Printer Settings.
- Printer Settings now forces full-width display so Receipt Builder cannot collapse into a narrow column.
- Improved Receipt Builder containment so rows, footer controls, and live preview stay inside the Printer Settings card.
- Added an inline Printer Settings save status message separate from the global Settings save status.

## 1.1.96

- Updated Printer Settings to open full-width so Receipt Builder has enough working space.
- Improved Receipt Builder layout with side-by-side logo/footer controls, cleaner header spacing, wider section controls, and a larger live preview.
- Existing saved Settings layouts now normalize Printer Settings to full-width automatically.

## 1.1.95

- Added a Receipt Builder inside Settings > Printer Settings.
- Admin/owner can now reorder receipt sections and toggle section visibility.
- Receipt Builder supports alignment, font size, bold text, divider lines, logo size, and footer message controls.
- Added a live receipt preview inside Settings.
- Complete Sale preview, printed receipts, and WhatsApp receipt text now follow the saved receipt template.

## 1.1.94

- Updated database backups to run for the actual detected database mode.
- Client PCs back up the configured Host database only when the PC is in Client mode.
- Host PCs now create local Host backups when no Client mode is detected.
- End-of-day and daily startup backup status messages now identify Host vs Client backups.
- Documented that the current SQLite database is not directly opened by SQL Server Management Studio.

## 1.1.93

- Added background Client PC SQLite backups.
- Client PCs now create one daily database backup on startup.
- End-of-day confirmation now schedules a Client database backup whether the drawer is Balanced, Over, or Short.
- Backup status notifications now advise users when a Client backup starts, completes, or fails.
- Client backups use SQLite's backup flow when the active database is open, with file-copy fallback when needed.

## 1.1.92

- Updated Settings Help for Printer Settings to explain receipt printing on/off behavior and WhatsApp receipt fallback.
- Added a Settings Help note that support for other messaging apps can be added upon customer request.
- Updated Database Mode Help to explain Host data storage/sharing and Client backup copy behavior for Host recovery.

## 1.1.91

- Updated Settings Help wording for Printer Settings, Database Mode, and User Account workflows.
- Printer Settings Help now explains printer selection and Complete Sale Enter-key behavior.
- Database Mode Help now explains Host vs Client purpose and why the section is locked.
- User Account Help now explains users and access permissions.

## 1.1.90

- Added Settings-specific Help content.
- Settings Help now explains Business, Payment Methods, Inventory toggles, User Account, Printer Settings, and Database Mode sections.
- Inventory toggle Help explains SKU, Barcode, Reorder At, Item Note, Stock Adjustment Reason, and New item badge timer controls.
- Payment Methods Help now explains checkout payment choices and sales tax behavior.

## 1.1.89

- Removed delete buttons from protected default inventory statuses: Active, Inactive, and Promotion.
- Updated Inventory Categories to start collapsed by default, matching other collapsible sections.
- Verified collapsible sections now open from an Expand state by default.
- Added maintenance comments across core modules, sections, buttons, toggles, and workflows to make future updates easier to follow.
- Ran broad JavaScript syntax checks across POS, main process, database, settings, inventory, dashboard, purchasing, audit, help, preload, and shared shortcut modules.

## 1.1.88

- Added a Status Catalog controller in the Inventory window.
- Inventory item status dropdowns now use the saved Status Catalog.
- Categories can now expand and collapse from the Inventory window.
- Status Catalog can expand and collapse and includes an Add Status button.
- Custom statuses are saved with POS settings and preserved through inventory saves.

## 1.1.87

- Updated the Inventory row layout so Tax and Delete render after optional item fields.
- When SKU, Barcode, Reorder At, Item Note, and Stock Adjustment Reason are enabled, Tax and Delete now sit to the right of Stock Adjustment Reason when space allows.

## 1.1.86

- Added inventory-specific Help content describing Categories, Inventory item entry, and Purchase Order workflow.
- Renamed the Inventory Add Bill button to Purchase Order.
- Added a Settings toggle for showing or hiding the Inventory Reorder At field.
- Reorder At is hidden by default while preserving saved reorder values.
- Moved the Inventory item delete button beside the Tax toggle.

## 1.1.85

- Added dashboard-specific Help content.
- Dashboard Help now explains the left list, center selected receipt/purchase order detail area, and right summary panel.
- Dashboard Help now documents All, Hold, Complete, Paid, and Unpaid filters and how held bills and unpaid purchase orders should be handled.

## 1.1.84

- Renamed the receipt completion modal title from Sale Complete to Complete Sale.
- Updated the Esc hold warning to refer to the Complete Sale window.

## 1.1.83

- Simplified the Help window to focus only on how to use the main POS sale workflow.
- Help now walks cashiers through Catalog item selection, Current Sale review, payment method choice, Amount Tendered entry, Complete Sale, and Sale Complete receipt actions.

## 1.1.82

- Login screen now focuses the Username field automatically.
- Renamed the Settings Staff section to User Account and removed the repeated User Accounts heading inside it.
- Changed the optional logout shortcut from Ctrl+Esc to Ctrl+L and made it work across POS, Settings, Inventory, Dashboard, Purchasing, Audit Log, and Help windows.
- Ctrl+L now closes secondary windows and returns the main POS to the login screen when enabled in Settings.
- Added a Help window with daily workflow, sale, settings, inventory, purchasing, dashboard, reporting, and shortcut guidance.
- Added Help access from setup, login, POS, Settings, Inventory, Dashboard, Purchasing, and Audit Log windows.
- Moved the hidden Settings layout-control shortcut to Ctrl+Shift+L so Ctrl+L can be used for logout.

## 1.1.81

- Updated the Staff section in Settings to expand and collapse like Database Mode.
- Moved User Accounts and Staff Access controls inside the Staff collapsible body.

## 1.1.80

- Reorganized Settings into clearer Business, Inventory, Payment Methods, Printer Settings, Database Mode, and Staff groups.
- Moved Theme into Business, New item badge timing into Inventory, and Staff Access into Staff with User Accounts.
- Updated saved Settings layout migration so existing installs open with the new grouped layout.

## 1.1.79

- Added Settings toggles to enable or disable Inventory SKU, Barcode, Item Note, and Stock Adjustment Reason fields.
- Hidden Inventory fields now preserve existing saved values instead of clearing them.
- Stock Adjustment Reason is only required when that Inventory field is enabled.

## 1.1.78

- Completed next focus option 2: Inventory operations.
- Inventory items now support SKU, barcode, reorder level, and stock adjustment reason fields.
- Manual stock changes require a Stock Adjustment Reason before Inventory can be saved.
- Dashboard now includes a Low Stock card with low-stock and out-of-stock counts.
- Catalog search now matches item code, name, SKU, or barcode.
- Inventory import templates include SKU, Barcode, and Reorder At columns.

## 1.1.77

- Added a Ctrl+Esc shortcut toggle in Settings.
- Ctrl+Esc on the main POS screen logs out or switches user when no modal window is open.
- Ctrl+Esc on the login screen asks for confirmation before closing the app.

## 1.1.76

- Restoring a held bill now focuses Amount Tendered so the cashier can enter payment immediately.

## 1.1.75

- Pressing Esc on the Sale Complete window now advises the user that the receipt will be placed on Hold.
- Sale Complete Esc handling now routes through the existing Hold flow instead of silently closing.

## 1.1.74

- Added the three-step next focus path: Dashboard reporting, Inventory operations, and Reliability.
- Dashboard reporting now shows richer summary cards for today’s sales, tax, discounts, cashier totals, payment totals, top items, categories, holds, voids, and purchase order totals.
- Purchase Orders summary now includes total bill amount and balance due.

## 1.1.73

- Escape-key window closing was revisited and hardened for secondary windows.
- Settings, Inventory, Purchasing, Dashboard/Held Receipts/Report, and Audit Log now recognize Escape by key or code.

## 1.1.72

- Dashboard receipt detail title card now reads Receipt Details with clearer helper text.

## 1.1.71

- Dashboard filter/catalog buttons now sit to the left of the search bar in the top action row.
- Dashboard filter spacing was tightened for the new header placement.

## 1.1.70

- Dashboard receipt detail panel now has a Displayed Receipt title card.
- Displayed receipt details now start at Order and omit Business, Address, and Contact/WhatsApp rows.

## 1.1.69

- Dashboard left list now has a Receipts title card to identify the records below.
- Dashboard receipt list height now shows about seven records before scrolling.
- Open Purchasing Bill now uses a compact button width matching the dashboard action buttons.

## 1.1.68

- Dashboard search, End-of-Day Report, and Audit Log controls now align side by side on desktop.
- Dashboard action controls only wrap on smaller screens.

## 1.1.67

- Reporting window title now shows Dashboard.
- Removed the duplicate Dashboard section heading from the Dashboard content area.
- Dashboard summary card labels now read Cashier, Payment Method, and Purchase Orders.

## 1.1.66

- Dashboard summary cards now sit in a right-side panel for a cleaner reporting layout.
- Audit Log now sits directly beside the admin End-of-Day Report button.
- Held Receipts and End-of-Day report modes keep their full-width layouts without an empty summary rail.

## 1.1.65

- Sale Complete now defaults the Enter key to Start Next Sale.
- Printer Settings includes a Sale Complete Enter key option for choosing Start Next Sale, WhatsApp, or Hold.
- The configured Sale Complete action is focused when the receipt window opens.

## 1.1.64

- Dashboard tabs now include purchasing bill filters for Paid and Unpaid beside All, Hold, and Complete.
- Dashboard All view now includes both receipts and purchasing bills, with clickable purchasing records that open the matching bill.
- Dashboard summary and tab badges now count purchasing bills.

## 1.1.63

- Audit Log Saved Purchasing entries now link directly to the saved purchasing bill.
- Clicking purchase-related audit records opens Purchasing with the matching bill loaded, similar to Bill Status.
- Applied Purchase to Inventory audit entries now include purchase bill targets.

## 1.1.62

- Added a Dashboard search bar beside the End-of-Day Report action.
- Dashboard tabs now act as quick status filters: All, Hold, Complete, and Void when voided receipts exist.
- Dashboard search filters receipts by order number, date, total, cashier, username, payment method, status, item name, item code, and item category.

## 1.1.61

- Moved Add Bill from Dashboard back into the Inventory window.
- Dashboard/Reporting now includes category tabs for filtering invoices and receipts by item category.
- Reporting category tabs are populated from categories found in the listed receipt items.

## 1.1.60

- End-of-Day Report preview now lets Admin/Owner choose the report day before opening the full report.
- The selected report day carries into the full End-of-Day Report window and filters receipts, holds, voids, cashier totals, and payment totals.
- Settings, Inventory, Purchasing, Dashboard/Reporting, Held Receipts, End-of-Day Report, and Audit Log windows now open maximized like the main POS window.

## 1.1.59

- Moved Audit Log access from Settings to the Dashboard action row beside End-of-Day Report.
- End-of-Day Report now opens a confirmation summary first for Admin/Owner users.
- The End-of-Day confirmation summary includes current report time, completed receipts, total sales, receipt range, cashier/user totals, payment totals, voids, and alerts.
- The confirmation summary Next button opens the full End-of-Day Report window.

## 1.1.58

- Added inventory item statuses: Active, Inactive, and Promotion.
- Inactive inventory items are greyed out and locked from editing except for changing status.
- Inactive items are hidden from the main POS sale catalog.
- Promotion items show a PROMO marker as work-in-progress special offer support.
- Deleting a purchase bill now marks newly created bill items inactive and writes the deletion reason into the item note.

## 1.1.57

- Purchasing bill deletion now opens an Admin / Owner password authorization window.
- Deleting an applied purchasing bill now reverses its recorded inventory stock additions.
- Price changes made from a purchase bill are tracked and restored when that bill is deleted.
- Applying a purchase item to an existing inventory item now asks before updating the sell price when the price differs.

## 1.1.56

- Audit Log entries can now open related purchasing transactions.
- Recorded Purchasing Payment audit entries now include a target bill link.
- Clicking a purchase-payment audit entry opens Purchasing and loads the matching bill/invoice.

## 1.1.55

- Purchasing Add Payment now clears the bill form after the payment and bill are saved.
- After Add Payment saves, focus returns to Company for entering the next bill.

## 1.1.54

- Add Payment in Purchasing now saves the bill record immediately after the payment is recorded.
- Purchasing payments now write an audit-log entry when saved from Add Payment.
- Bill Status now shows the latest payment timestamp, using a Paid timestamp when the bill balance reaches `$0.00`.

## 1.1.53

- Escape now closes secondary POS windows, while leaving the main POS register window open.
- Purchasing Bill Status now updates live from the active bill draft before Save Purchasing is clicked.

## 1.1.52

- Made Purchasing Bill Status cards smaller and anchored them to the top of the status panel.
- Bill Status now shows each bill's internal bill number plus saved date and time.
- Bill Status is sorted newest first from top to bottom.
- Deleting a saved purchasing bill now requires an administrator password and is recorded in the audit log.

## 1.1.51

- Moved Bill Status to the right side of the Purchasing window on desktop.
- Removed the manual Paid checkbox; bill status is now automatically Paid when Balance Due reaches `$0.00`.
- Updated Purchasing notes placeholder text to tell users they can record when, where, and how payment was made.

## 1.1.50

- Moved Notes below the payment summary and put Payment Amount above Add Payment.
- Add Payment now immediately records the entered amount against the bill and reduces Balance Due.
- Payments now stamp the date and time when the payment was made.

## 1.1.49

- Save Purchasing now clears the bill entry fields after saving.
- Saved bills remain listed in Bill Status below the Purchasing action buttons.
- Clicking a Bill Status row loads that saved bill into the cleared form so payments can be added.

## 1.1.48

- Add Bill in Purchasing now creates a fully cleared new bill draft.
- New bill drafts clear company, invoice, date, bill total, notes, payments, and Paid status.

## 1.1.47

- Added a Bill Status list below Reload and Save Purchasing in Purchasing.
- Purchasing bill statuses list each bill as Paid or Unpaid with remaining balance.

## 1.1.46

- Added payment cataloging to Purchasing / Company Bills.
- Payments can be recorded with payment date and amount below Notes.
- Purchasing now shows total payments and remaining balance due for each company bill.
- Paid can only be checked when the remaining bill balance is `0.00`.

## 1.1.45

- Added an admin/owner End-of-Day Report button in Dashboard/Reporting.
- Admin/owner users can open the cash-out End-of-Day Report workflow when they need to cash for the day.
- End-of-Day Report window now labels the logged-in admin/owner instead of always showing Staff.

## 1.1.44

- Moved Save Settings out of all Settings sections into its own lower-right floating control.
- Save Settings status now floats with the standalone Save Settings control.

## 1.1.43

- Moved Save Settings out of the collapsible Database Mode body and aligned it with the Expand/Collapse control.
- Database Mode now starts collapsed by default.

## 1.1.42

- Moved Save Settings into the lower-right of the Database Mode section without covering Apply Database Mode.
- Made the Database Mode section collapsible with a Collapse/Expand control.

## 1.1.41

- Removed the white floating panel behind Save Settings.
- Moved the floating Save Settings button to the right side of the Settings window.

## 1.1.40

- Renamed Settings `Receipt Printing` section to `Printer Settings`.
- Moved `Refresh Printers` into the Printer Settings section directly below silent print.
- Made printer status and Save Settings status more visible.
- Made the Save Settings action float over Settings options while scrolling.

## 1.1.39

- Moved Purchasing / Company Bills out of Inventory and into its own Purchasing window.
- Added an Add Bill button to Dashboard that opens Purchasing with a new blank company bill.
- Inventory now saves categories and inventory items without showing the purchasing section.

## 1.1.38

- Hid the Inventory Import/Export button until the import/export workflow is ready to continue.
- Patch notes will be updated with each feature, fix, and visible application change going forward.

## 1.1.37

- Added consolidated patch notes covering the application history from `1.0.0` onward.

## 1.1.36

- Hid `Edit Layout` and `Reset Layout` in Settings by default.
- Added `Ctrl+L` in Settings to toggle layout controls visible.
- Automatically turns layout edit mode off when layout controls are hidden.

## 1.1.35

- Suppressed Electron startup diagnostic logging so official-build CHECK messages do not appear during launch.

## 1.1.34

- Added movable and resizable Business settings controls.
- Business name, address, logo, WhatsApp number, held bill timer, and New item badge timer can be rearranged inside the Business section.
- Business controls can be resized between half-width and full-width.
- Reset Layout now resets both Settings section layout and Business section layout.

## 1.1.33

- Moved the default Host SQLite database from Documents into a `POS Database` folder beside the installed application.
- Added one-time migration from the old `Documents\Simple POS Data` database location when needed.
- Host database backups now use the new application-owned database directory.

## 1.1.32

- Updated the Settings layout `Move` control to match the `Resize` button style.
- Raised the layout control bar above nearby content so the Move button remains clickable.

## 1.1.31

- Added locked Host/Client database mode controls in Settings.
- Added `Ctrl+1` unlock behavior for admin/owner database mode changes.
- Added local backup behavior when a client cannot reach the configured host database.
- Added database copy support when changing Host location.

## 1.1.30

- Added Settings layout customization.
- Sections can be moved and resized between half-width and full-width.
- Added `Edit Layout` and `Reset Layout` controls.
- Persisted layout choices in POS settings.

## 1.1.29

- Made Settings, Inventory, Dashboard, Held Receipts, Report, and Audit windows modal.
- POS behind those windows is inactive while an admin/management window is open.
- Existing secondary windows now refocus instead of opening duplicates.

## 1.1.x Major Feature Builds

- Renamed Reporting button to Dashboard.
- Reporting/Dashboard auto-refreshes every 10 seconds.
- Admin, Administrator, and Owner users no longer see extra Refresh or Generate End-of-Day Report buttons in Dashboard.
- Application title updates to `Business Name - POS` after business setup.
- Added Lotus POS app icon and Lotus Glow default theme.
- Added installer license agreement with ownership rights and WhatsApp sharing notice.
- Updated Windows shortcuts to use the Lotus icon and business-based app name.
- Added first-run setup wizard for business name, address, contact number, and owner/admin credentials.
- Fresh builds start without preloaded business profile, inventory items, or categories.
- First startup selects local SQLite Host database automatically before setup.
- Receipt printing and silent printing are disabled by default on first setup.
- Receipt printer options are greyed out when receipt printing is disabled.
- Sale Complete only shows Print Receipt when receipt printing is enabled and allowed for the logged-in user.
- Staff Sale Complete actions hide Print Receipt even if admin printing is enabled.
- Sale Complete hides the top close button.
- Receipt headers now show Address, Contact, Receipt #, and Date before item lines.
- Added discount workflow with in-app confirmation.
- Discount can be applied after Amount Tendered is entered.
- Discount subtracts from total, not tendered amount.
- Discounts use percentages instead of dollar amounts.
- Added per-user discount limits for non-admin cashiers.
- Current Sale shows active discount percentage.
- Pressing Enter in Amount Tendered opens Sale Complete when payment covers total.
- Added Inventory Import/Export window.
- Template export creates an Excel sheet with category dropdowns.
- Import generates item codes after import.
- Import templates no longer include sample cosmetic rows.
- Added single-instance app behavior that focuses the existing POS window on second launch.
- POS opens maximized on startup and when refocused.
- Added staff access permissions and admin password protection for held bill restore.
- Staff login includes restricted Held Receipts and Report actions.
- Held Receipts shows full receipt details and prompts for admin authorization unless Settings allows staff restore.
- Reporting restores only one held bill at a time and returns focus to Current Sale.
- Hold, restore, delete, and reporting actions are recorded in Audit Log.

## 1.0.80 - 1.0.99

- Added SQLite persistence with `better-sqlite3`.
- POS data moved away from Electron JSON userData storage.
- SQLite stores inventory, categories, purchasing/company bills, reporting, settings, users, invoices, voids, and audit logs.
- Added native SQLite dependency rebuild after install for Electron compatibility.
- Added startup handling for SQLite open failures.
- Version numbering now rolls from `1.0.99` to `1.1.0`.
- Added purchasing/company bill entry.
- Purchasing supports supplier invoice number, notes, individual items, and adding purchased quantities into inventory.
- Existing inventory item stock increases when matching purchased items are added.
- App startup always asks for login instead of restoring an old session.
- Startup defers hidden register rendering until after login for faster login screen load.

## 1.0.60 - 1.0.79

- Added end-of-day reporting workflow.
- End-of-day report summarizes sales, payment methods, refunds, voids, cash differences, alerts, and next-shift actions.
- Added cashier counted drawer confirmation.
- Drawer status shows Balanced, Over, or Short.
- Cash confirmation supports denomination counts from `$1` through `$10,000`.
- Cash counts display in a 5-column grid.
- Credit Card and Debit Card confirmation fields support decimal values.
- End-of-day Confirm advances to unconfirmed payment methods with expected totals.
- Drawer status updates in real time while cashier counts are entered.
- End-of-day summary can be saved as a PDF in Documents/End of Day Report.
- PDF names use CashierName-Date-Time.
- Save & Send opens the saved PDF location and the WhatsApp/share flow.
- WhatsApp fallback includes file name and drag-and-drop instructions instead of only sending a local path.
- End-of-day summary shows the saved location as a green clickable link.
- End-of-day Report Date uses the PC date/time captured when the report is generated.
- End-of-day summary dialog removes the top-right close button.
- System Issues label changed to Alert.
- End-of-day report uses a two-column layout with summary rows on the right.
- Cash denomination boxes are constrained to avoid overlapping report information.

## 1.0.40 - 1.0.59

- Added Reporting window for invoices and receipts.
- Reporting lists newest receipts first.
- Receipts include status colors: Hold in orange, Complete in green.
- Held bills can be restored or deleted.
- Held bills are saved for a configurable period.
- Held bill message remains visible for 15 seconds, then fades out.
- Completed receipts can be cleaned up after 24 hours.
- Added one-held-bill-at-a-time restore protection.
- Restore Bill closes Reporting and returns to the Current Sale screen.
- Hold and Void actions moved to the Sale Complete screen.
- Void records connect back to end-of-day void totals.
- Void button was later removed from Sale Complete.
- Start Next Sale closes Sale Complete immediately and completes receipt save in the background.
- Receipt save no longer embeds full settings data, preventing oversized invoice JSON.
- Sequential order numbers are saved and remain consistent after closing and reopening the POS.
- Invoices are tied to logged-in user name, username, and role.
- Reporting cashier totals fall back to cashier name for older receipts with unknown usernames.

## 1.0.20 - 1.0.39

- Added separate Settings window.
- Added separate Inventory window, renamed from Management.
- Added item modification for name, price, category, code, stock, and taxable status.
- POS generates item codes on creation.
- New inventory items appear at the top of the Inventory list.
- Code remains blank until category is selected and the new item row is saved.
- New item row Save persists immediately to the database.
- Newly saved inventory items display a New badge in Inventory and the main Catalog.
- New badge uses a red/yellow corner ribbon style.
- New badge timer can be enabled/disabled and defaults to 24 hours when enabled.
- Added category list creation.
- Added configurable sales tax.
- Sales tax moved into Payment Methods in Settings.
- Each item can toggle taxable on/off.
- Added configurable payment methods with defaults: Cash, Debit Card, Credit Card.
- Added receipt printing toggle.
- If receipt printing is off, Sale Complete shows Hold, WhatsApp, and Start Next Sale only.
- Printer, paper size, and silent print controls are disabled when receipt printing is off.
- Added receipt printer support for Letter, 80mm receipt, and 58mm receipt paper.
- Added WhatsApp receipt sharing.
- Added business logo selection with square logo picker.
- Business address and contact information appear on receipts.

## 1.0.0 - 1.0.19

- Created the first Windows-ready Electron POS application.
- Built for cosmetic retail: hair, nails, perfume, makeup, and skincare items.
- Added product catalog and Current Sale cart.
- Added checkout with subtotal, tax, total, amount tendered, and change.
- Added Sale Complete receipt preview.
- Added staff/admin login.
- Added Settings access for administrators.
- Added user account setup for name, username, password, and role.
- Staff options hide restricted admin windows.
- Added ability to switch user from cashier card.
- Login screen hides menu/branding clutter.
- Current Sale list scrolls independently when more than six items are added.
- Current Sale auto-scrolls to the newest item.
- Adding an item focuses Amount Tendered.
- Application can be compiled to a Windows `.exe` installer.
