(function () {
  // Help module: swaps content based on the topic requested by each window's Help button.
  const title = document.querySelector("#helpTitle");
  const content = document.querySelector("#helpContent");
  const params = new URLSearchParams(window.location.search);
  const requestedTopic = params.get("topic");
  const topic = ["dashboard", "inventory", "settings"].includes(requestedTopic) ? requestedTopic : "pos";

  const posHelp = `
    <section class="settings-section help-section">
      <h2>Sale Workflow</h2>
      <ol class="help-list">
        <li>Search or select items listed below Catalog.</li>
        <li>After selecting items, the user will see items related to the sale on the right window.</li>
        <li>Select Payment Method from the drop down.</li>
        <li>Enter customer paid amount in Amount Tendered.</li>
        <li>Press Enter on the keyboard or click Complete Sale.</li>
        <li>The next window will show the customer receipt. The user can Hold Customer Order, send by WhatsApp, print when enabled, or start the next sale.</li>
      </ol>
    </section>

    <section class="settings-section help-section">
      <h2>Quick Keys</h2>
      <ul class="help-list">
        <li>Enter completes the sale after Amount Tendered is filled in.</li>
        <li>Esc on Complete Sale places the receipt on Hold after warning.</li>
        <li>Ctrl+L logs out to the login screen when enabled.</li>
      </ul>
    </section>
  `;

  const dashboardHelp = `
    <section class="settings-section help-section">
      <h2>Dashboard Layout</h2>
      <ol class="help-list">
        <li>The left side lists receipts or purchase orders based on the selected filter.</li>
        <li>The center area shows the selected receipt or purchase order from the left list.</li>
        <li>The right side shows totals and summary cards for quick review.</li>
      </ol>
    </section>

    <section class="settings-section help-section">
      <h2>Viewing Receipts</h2>
      <ul class="help-list">
        <li>All shows everything available in the Dashboard list.</li>
        <li>Hold shows cashier transactions that are currently on hold.</li>
        <li>Complete shows cashier transactions that were completed.</li>
        <li>Use the search bar to find a specific receipt, order number, cashier, payment method, or purchase order.</li>
      </ul>
    </section>

    <section class="settings-section help-section">
      <h2>Held Bills</h2>
      <p>Held bills can be selected from the left list, restored, and completed from the POS screen. Restoring a held bill brings the order back to Current Sale so payment can be entered and completed.</p>
    </section>

    <section class="settings-section help-section">
      <h2>Purchase Orders</h2>
      <ul class="help-list">
        <li>Paid and Unpaid filters are for Purchase Orders.</li>
        <li>To complete an unpaid purchase order, click Unpaid, then select the purchase order from the left list.</li>
        <li>The selected purchase order opens in the center area so the user can review balance, payments, and bill details.</li>
      </ul>
    </section>
  `;

  const inventoryHelp = `
    <section class="settings-section help-section">
      <h2>Inventory Layout</h2>
      <p>Inventory is broken up into two options: Categories and Inventory.</p>
      <ul class="help-list">
        <li>Categories are used for item categorization, such as Hair, Nails, Makeup, Perfume, and Skincare.</li>
        <li>Status Catalog controls the item statuses available in the Inventory item status drop down.</li>
        <li>The Inventory section is used to add, edit, and save items that appear in the POS Catalog.</li>
      </ul>
    </section>

    <section class="settings-section help-section">
      <h2>How To Add An Item</h2>
      <ol class="help-list">
        <li>Click the Add Item button. A new item field will populate in the list below.</li>
        <li>Add the item name.</li>
        <li>Select the item category.</li>
        <li>Add the item price.</li>
        <li>Add stock if there is any.</li>
        <li>Reorder At is optional and only appears when enabled in Settings.</li>
        <li>Select Save on the new item to save it.</li>
      </ol>
    </section>

    <section class="settings-section help-section">
      <h2>Purchase Orders</h2>
      <p>Use Purchase Order to add multiple items from a supplier. The Purchase Order window is used for supplier/company bills, purchase payments, and adding purchased items into inventory.</p>
    </section>
  `;

  const settingsHelp = `
    <section class="settings-section help-section">
      <h2>Business</h2>
      <p>Business controls the information shown on receipts and reports. Use it to set the business name, address, logo, WhatsApp number, window theme, and held bill save timer.</p>
    </section>

    <section class="settings-section help-section">
      <h2>Activation</h2>
      <p>Activation generates a PC-specific request for a client license. It uses the Windows motherboard serial number, current date and time, and Business name. POS opens the backup email account in the browser with the activation message ready as a draft. The To field is left empty so the user can enter the primary/client email, send it, then copy the activation number into POS for verification.</p>
    </section>

    <section class="settings-section help-section">
      <h2>Payment Methods</h2>
      <p>Payment Methods controls what cashiers can select during checkout. Cash, Debit Card, and Credit Card are the default options. Add or disable methods based on what the store accepts.</p>
      <p>Sales tax rate is also managed here and is applied to taxable items during each sale.</p>
    </section>

    <section class="settings-section help-section">
      <h2>Inventory Toggles</h2>
      <ul class="help-list">
        <li><strong>Enable New item badge timer</strong> controls whether NEW item badges expire automatically.</li>
        <li><strong>New item badge time</strong> sets how many hours the NEW badge stays visible when the timer is enabled.</li>
        <li><strong>Enable SKU</strong> shows or hides the SKU field in Inventory item rows.</li>
        <li><strong>Enable Barcode</strong> shows or hides the Barcode field in Inventory item rows.</li>
        <li><strong>Enable Reorder At</strong> shows or hides the optional Reorder At stock level field.</li>
        <li><strong>Enable Item Note</strong> shows or hides the item note field for owner/staff notes.</li>
        <li><strong>Enable Stock Adjustment Reason</strong> shows the reason field and requires a reason when stock quantity is changed manually.</li>
      </ul>
    </section>

    <section class="settings-section help-section">
      <h2>User Account</h2>
      <p>User Account is for setting up users and controlling what each user can and cannot access. Use this section to manage cashier/admin users, passwords, role access, discount limits, held receipt restore permissions, and the Ctrl+L logout shortcut.</p>
    </section>

    <section class="settings-section help-section">
      <h2>Printer Settings</h2>
      <p>Printer Settings is used to add or select a receipt printer if one is available. Receipt printing can be toggled on or off.</p>
      <p>If receipt printing is toggled off, no printing will be available from the Complete Sale window. Receipts can still be sent by WhatsApp.</p>
      <p>Support for other messaging apps will be added upon customer request.</p>
      <p>This section also controls paper size, silent printing, and what the Enter key does on the Complete Sale window.</p>
      <p>Receipt Builder lets an admin or owner choose which receipt sections appear, set text size, toggle bold text and divider lines where available, write a custom footer message, and collapse the builder when it is not needed. The live preview shows how printed and shared receipts will look.</p>
    </section>

    <section class="settings-section help-section">
      <h2>Database Mode</h2>
      <p>Database Mode controls where POS data is saved and how computers share the database.</p>
      <p>Host stores, secures, and shares POS data. Client connects to the Host database so another PC can use the same inventory, receipts, reports, users, and purchasing records.</p>
      <p>If there is a Client PC connecting to the database, a copy is created so the Host can be changed if the Host PC is damaged.</p>
      <p>This section is locked by default so staff do not accidentally change the store data location. It can be unlocked with Ctrl+1 when an admin or owner needs to change database location or mode.</p>
    </section>
  `;

  const topics = {
    pos: {
      title: "How To Use The POS",
      html: posHelp
    },
    dashboard: {
      title: "How To Use Dashboard",
      html: dashboardHelp
    },
    inventory: {
      title: "How To Use Inventory",
      html: inventoryHelp
    },
    settings: {
      title: "How To Use Settings",
      html: settingsHelp
    }
  };

  title.textContent = topics[topic].title;
  content.innerHTML = topics[topic].html;
})();
