# Simple POS

Simple POS is a Windows-ready Electron point of sale app for cosmetic retail: hair, nails, perfume, makeup, and skincare items. It includes staff/admin login, cart checkout, receipt preview, a separate admin settings window, printer setup, WhatsApp receipt sharing, editable business name, and inventory item editing.

## Test Locally

Install dependencies once:

```powershell
npm install
```

Run the desktop app:

```powershell
npm start
```

Default users:

| Role | Username | Password |
| --- | --- | --- |
| Administrator | `admin` | `admin123` |
| Staff | `staff` | `staff123` |

## Build Windows Installer

Create a Windows `.exe` installer:

```powershell
npm run build:win
```

The installer will be created in the `dist` folder.

## Patch Notes

See [PATCH_NOTES.md](PATCH_NOTES.md) for the full application changelog from `1.0.0` onward.

## Next Focus Path

1. Dashboard reporting polish: sales, cashier, payment, item/category, holds, voids, tax, discount, and purchase order totals.
2. Inventory operations: barcode/SKU, reorder levels, low-stock dashboard card, and stock adjustment reasons.
3. Reliability: backup/restore, database health checks, report exports, and admin recovery tools.
4. Receipt Builder responsive mode: automatically stack Live Receipt Preview below the editor on smaller laptop widths.

## Settings

Log in as `admin`, open Settings, and manage:

- Business name shown on the register and receipts
- WhatsApp number used for receipt sharing
- Receipt printer
- Letter, 80mm receipt, or 58mm receipt paper
- Silent printing
- Inventory item code, name, category, and price
- Business sales tax rate in Settings
- Per-item taxable on/off control
- Category list creation and inventory management
- Reporting window with saved receipts/invoices
- User account setup in Settings
- Mixed horizontal/vertical Settings layout for business, printer, and user account setup
- Settings are grouped by Business, Inventory, Payment Methods, Printer Settings, Database Mode, and User Account
- User Account settings can expand or collapse like Database Mode
- Help is available from setup, login, POS, Settings, Inventory, Dashboard, Purchasing, and Audit Log windows
- Receipt printing toggle that controls whether Print Receipt appears after sale completion
- Receipt statuses in Reporting with orange Hold and green Complete states
- Hold bill restore/delete actions and automatic completed receipt cleanup after 24 hours
- Business logo upload in Settings
- Square business logo picker and hidden Current Sale clear button
- Configurable payment methods in Settings
- Settings toggles for Inventory SKU, Barcode, Item Note, and Stock Adjustment Reason fields
- Inventory has collapsible Categories and Status Catalog controls, with protected default statuses
- End-of-day Reporting summary by cashier and payment method
- End of Day button in Reporting to focus the receipt list on today's completed sales
- Sequential saved order numbers that remain consistent after closing and reopening the POS
- Generated end-of-day POS report covering sales, payment methods, refunds, voids, cash differences, system issues, and next-shift actions
- Current Sale item list scrolls independently when more than six items are added
- Current Sale Void button that records voided carts for end-of-day reporting
- End-of-day report payment methods listed vertically
- Current Sale auto-scrolls to the newest added item when the cart overflows
- Current Sale Hold button saves a bill for later purchase and shows the red hold-retention notice
- Admin setting for held bill save time in hours
- Reporting receipt details hide cashier login usernames
- Dashboard includes an Add Bill button that opens Purchasing / Company Bills for supplier purchases
- App startup always requires login instead of restoring a prior session
- Startup defers hidden register rendering until after login for a more responsive login screen
- Hold and Void actions moved to the Sale Complete screen
- Main POS window opens maximized on startup and when refocused from a second launch
- Startup loads only saved business identity and users before login; full POS data loads after sign-in
- Hold and Void buttons save the current bill as visible Reporting statuses
- Hold button explicitly confirms the held bill, closes Sale Complete, and refreshes its hold timestamp
- Void button removed from Sale Complete and order-number reservation optimized for faster Sale Complete display
- Start Next Sale closes Sale Complete immediately while marking the receipt complete in the background
- Reporting lists newest invoices and receipts first
- Receipt saves no longer embed full settings data, preventing oversized invoice JSON
- Held bill confirmation remains visible for 15 seconds, then fades out
- First startup creates a local SQLite database for inventory, categories, purchasing bills, reporting, settings, and users
- Host/Client database mode is locked by default and can be unlocked in Settings with Ctrl+1 by an admin/owner
- Database backups run in the background after end-of-day confirmation; startup backup defaults off on Host PCs and on for Client PCs unless Admin/Owner changes the Database Mode toggle
- Database Mode includes an Open Backup Location button
- SQLite database files are not directly managed through SQL Server Management Studio; SQL Server support would require a separate database migration
- Reporting restores only one held bill at a time, closes immediately, and returns focus to Current Sale
- Staff login shows a Held Receipts button that opens a restricted hold-only receipt list
- Held Receipts shows full receipt details and prompts staff for administrator authorization unless the Settings toggle allows restore
- Held Receipts opens in a larger window with a wider full-detail layout
- Settings, Inventory, and Reporting windows now open in larger desktop layouts
- Settings includes selectable gradient themes applied across POS windows
- Settings layout moves Payment Methods above Receipt Printing, places Sales Tax with payments, and puts Staff Access below User Accounts
- Business settings include address, and receipt headers show business name, address, and WhatsApp when configured
- Inventory Add Item inserts the new item at the top of the inventory list
- New inventory items keep Code blank until category is selected and the row Save button is clicked
- New inventory item row Save persists immediately to the configured storage/database
- Newly saved inventory items show a small New badge in Inventory and the main Catalog
- Held bill and New item timers can be toggled on/off in Settings, default to 24 hours when enabled, and save immediately when changed
- Settings User Accounts includes an Audit Log window showing user activity for sales, holds, restores, settings, inventory, and reporting access
- Cashier card shows the logged-in user's name and username without field labels
- Reporting cashier totals now fall back to cashier name when old receipts have an unknown username
- Staff login includes a Report button that only opens the end-of-day report generator
- Staff Report opens with the end-of-day report already generated
- Staff end-of-day report hides the extra report title/action row
- End-of-day Save & Send reveals the saved PDF location and opens Windows sharing for the PDF file
- End-of-day report window closes after Save & Send finishes successfully
- End-of-day WhatsApp fallback no longer sends the saved PDF file path as message text
- End-of-day WhatsApp fallback shows the saved PDF file name and drag-and-drop instruction
- Adding an item to the current sale focuses the Amount tendered textbox
- Inventory includes a Template button that creates an Excel item import template
- Version numbers roll over after patch 99, so 1.0.99 is followed by 1.1.0
- POS data now saves to SQLite in a `POS Database` folder beside the installed application instead of Electron userData settings JSON
- First startup shows a business and owner admin setup wizard before login
- First startup now selects the local SQLite host database automatically before setup
- Reporting hides Refresh and Generate End-of-Day Report for admin, administrator, and owner users
- Reporting auto-refreshes every 10 seconds and the main Reporting button is now Dashboard
- Application/window title updates to Business Name - POS after business setup
- Application icon uses a lotus POS design and the default theme is Lotus Glow
- First-run setup saves receipt printing and silent printing disabled by default
- Receipt printer options are disabled and greyed out when receipt printing is off
- Sale Complete receipt dialog hides the top close button
- Sale Complete only shows Print Receipt when receipt printing is explicitly enabled
- Receipt headers show Address, Contact, Receipt #, and Date before item lines
- Discount now prompts for an amount and asks for confirmation before changing the sale total
- User Accounts now include per-user discount limits for non-admin cashiers
- Discount now opens an in-app confirmation window that works after Amount tendered is entered
- Discount is enabled only after Amount tendered is entered and subtracts from the sale total
- Discount entry and staff discount limits now use percentages instead of dollar amounts
- Current Sale discount summary shows the active discount percentage
- Fresh builds start with no business profile, inventory items, or categories preloaded
- Inventory import templates no longer include sample cosmetic item rows
- Inventory Import/Export window creates category-dropdown templates and imports Excel rows with generated item codes
- Windows shortcuts now use the Lotus app icon and rename to Business Name - POS after setup
- Shortcut cleanup now runs at startup and points directly to the packaged Lotus icon file
- Windows installer now shows a license agreement with ownership rights and WhatsApp sharing requirements
- Settings, Inventory, Dashboard, Held Receipts, Report, and Audit windows are modal so the POS behind them stays inactive
- Settings includes an Edit Layout mode for dragging sections and resizing them between half-width and full-width
- Settings includes locked Host/Client database mode controls that unlock with Ctrl+1 and back up local data when a client host is unavailable
- Staff Sale Complete actions hide Print Receipt even when admin printing is enabled
- Pressing Enter in Amount tendered opens Sale Complete when payment covers the total
- Current Sale includes a fixed Discount button that subtracts from the final total
- End-of-day report includes cashier counted cash confirmation with Short, Over, and Balanced drawer status
- Staff Held Receipts and Report buttons sit to the left of the switch-user card
- End-of-day cash confirmation supports denomination counts for $1 through $10,000
- End-of-day confirmation can switch between Cash, Credit Card, and Debit Card, with cash shown in a 5-column grid
- End-of-day cash/card count fields hide browser number steppers
- End-of-day count fields are capped at nine digits, maximum 999999999
- End-of-day $1 cash, Credit Card, and Debit Card counts accept two decimal places
- End-of-day report requires Confirm to show Balanced, Over, or Short and previews WhatsApp summaries before sending
- End-of-day drawer status updates in real time while cashier counts are entered
- End-of-day Confirm advances to unconfirmed payment methods with expected totals before sharing
- End-of-day decimal fields support numpad decimal input without moving the cursor
- POS cash tendered field supports numpad decimal input without moving the cursor
- Decimal money fields use text input mode so numpad decimal does not clear values
- Balanced end-of-day summaries can be saved locally and opened in WhatsApp for the owner
- End-of-day Balanced status is shown as green summary text
- End-of-day reports save as PDFs in Documents/End of Day Report named CashierName-Date-Time
- End-of-day WhatsApp sharing opens contact selection instead of forcing a saved number
- End-of-day counts can be confirmed when Balanced, Over, or Short, with summary warning for issues
- End-of-day payment auto-advance focuses the next amount input
- End-of-day summary dialog removes the top-right close button
- End-of-day report labels System Issues as Alert
- End-of-day summary shows a green saved-location link that opens the PDF in File Explorer
- End-of-day Report Date uses the PC date/time captured when the report is generated
- Save & Send to WhatsApp also opens the saved PDF location in File Explorer
- End-of-day report uses a two-column layout with summary rows on the right
- End-of-day cash denomination boxes are constrained to the left report column
- Staff user card moved to the top action area with an updated card switch caption; standalone Logout button hidden
- Login credential hints are hidden unless Ctrl+0 is held, and they reflect current configured users
- Settings user passwords include a Show/Hide button for administrator account maintenance
- Settings User Accounts includes a password recovery note for the hidden login credential shortcut
- Password recovery note in Settings is highlighted in green
- Login screen no longer displays the Windows POS eyebrow label
- SQLite startup logs an error if the database cannot open; POS data is no longer written to JSON storage
- Native SQLite dependencies rebuild automatically after install for Electron compatibility
- Purchasing bills support individual supplier invoice items and can add quantities into inventory stock
- Invoices tied to logged-in username, name, and role
- Refined Settings grid layout with paired desktop sections and full-width user account management
- Single-instance app behavior that focuses the existing POS window when launched again
- Staff access permissions and administrator-password protection for held bill restore
- Settings layout Move control now matches the Resize button style and stays clickable while editing layout
- Default Host database storage now lives in the app installation folder under `POS Database`, with one-time migration from the old Documents data folder
- Business settings fields and logo tile can now be moved and resized while editing the Settings layout
- Electron startup diagnostic logging is suppressed so official-build CHECK messages do not appear during app launch
- Settings Edit Layout and Reset Layout buttons stay hidden until Ctrl+Shift+L toggles layout controls visible
- Added consolidated patch notes in `PATCH_NOTES.md`
- Inventory Import/Export button is hidden until that workflow is resumed
- Purchasing / Company Bills now opens in its own window from the Dashboard Add Bill button
- Settings Printer Settings section has inline printer refresh, clearer printer status, and floating Save Settings controls
- Printer Settings includes a Receipt Builder for admin/owner receipt field visibility, text size, bold text, divider lines, logo size, footer text, and live preview
- Floating Save Settings now sits on the right without a white panel behind it
- Database Mode in Settings is collapsible and starts collapsed
- Save Settings now floats outside all Settings sections in the lower-right corner
- Admin/owner Dashboard includes an End-of-Day Report button for cash-out reporting
- Purchasing bills can catalog payments and only allow Paid when balance due is $0.00
- Purchasing lists bill status below Reload and Save Purchasing as Paid or Unpaid
- Purchasing Add Bill starts a cleared new bill draft
- Saved Purchasing bill status rows can be clicked to reload a bill for payment entry
- Purchasing payment amount now stamps date/time and reduces Balance Due when Add Payment is clicked
- Purchasing Bill Status now sits beside the bill form on desktop and automatically marks bills Paid at `$0.00` balance
- Purchasing Bill Status shows compact newest-first bills with internal bill number, date/time, and admin-password deletion
- Escape closes secondary POS windows, and Purchasing Bill Status updates live while entering a new bill
- Purchasing Add Payment now immediately saves the bill, audits the payment, and shows the latest payment/paid timestamp in Bill Status
- Purchasing Add Payment clears the bill form after saving so the next bill can be entered cleanly
- Audit Log can open recorded purchasing payment entries directly in the matching Purchasing bill
- Purchasing bill deletion requires Admin/Owner authorization and reverses recorded stock and tracked price changes
- Purchasing asks before updating an existing inventory item sell price from a new bill
- Inventory items now support Active, Inactive, and Promotion statuses
- Deleted purchase bills mark newly created bill items inactive with the reason saved in the item note
- Dashboard now includes Audit Log beside End-of-Day Report
- Admin/Owner End-of-Day Report opens a generated summary confirmation before the full report window
- End-of-Day Report supports selecting the report day
- Secondary POS windows now open maximized like the main register
- Add Bill is available from Inventory
- Dashboard/Reporting can filter receipts by status tabs
- Dashboard search and status tabs make it easier to pull Hold, Complete, and matching receipt data
- Dashboard includes Paid and Unpaid purchasing bill filters, counts purchasing bills, and opens matching purchase records
- Audit Log can open saved purchasing and purchase inventory records directly in Purchasing
- Sale Complete Enter key defaults to Start Next Sale and can be changed in Printer Settings
- Dashboard summary cards now use a right-side panel with Audit Log beside End-of-Day Report
- Dashboard window and summary labels now use Dashboard, Cashier, Payment Method, and Purchase Orders wording
- Dashboard search, End-of-Day Report, and Audit Log controls align side by side on desktop
- Dashboard receipt list includes a title card, shows seven records before scrolling, and uses a compact Open Purchasing Bill action
- Dashboard displayed receipt panel includes its own title card and starts details at Order
- Dashboard filter buttons sit to the left of the search bar in the top action row
- Dashboard receipt detail card is labeled Receipt Details with clearer helper text
- Escape closes secondary windows more reliably across Settings, Inventory, Purchasing, Dashboard, Report, and Audit Log
- Dashboard reporting cards summarize sales, tax, discounts, cashier/payment totals, top items/categories, holds, voids, and purchase orders
- Pressing Esc on Sale Complete warns the user and places the receipt on Hold
- Restored held bills focus Amount Tendered so cashiers can enter payment immediately
- Optional Ctrl+L shortcut logs out to the login screen across POS windows and confirms app close from login
- Inventory operations include SKU/barcode, reorder level, low-stock dashboard card, and required stock adjustment reasons

Inventory is managed from the separate `Inventory` window. New items receive a generated code automatically when they are created.
