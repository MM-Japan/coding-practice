function formatCurrency(value) {
  return "$" + parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function insertTableData(table, headerText, data, formatFn) {
  const headerRowIndex = findRow(table, headerText);
  if (headerRowIndex !== -1 && data && data.length) {
    const reversedData = data.reverse();
    reversedData.forEach(item => {
      const newRow = table.insertTableRow(headerRowIndex + 1);
      newRow.insertTableCell(0).setText(item.description || '');
      newRow.insertTableCell(1).setText(formatFn(item.price || 0));
      newRow.insertTableCell(2).setText((item.qty || 0).toString());
      newRow.insertTableCell(3).setText(formatFn(item.total || 0));
    });
  }
}

function insertStaffNotes(table, staffNotes) {
  const reversedNotes = staffNotes.reverse();
  reversedNotes.forEach(note => {
    const newRow = table.insertTableRow(1);
    newRow.insertTableCell(0).setText(note.date || '');
    newRow.insertTableCell(1).setText(note.note || '');
    newRow.insertTableCell(2).setText(note.staff || '');
  });
}

function insertPayments(table, payments, formatFn) {
  const reversedPayments = payments.reverse();
  reversedPayments.forEach(payment => {
    const newRow = table.insertTableRow(1);
    newRow.insertTableCell(0).setText(formatFn(payment.amount || 0));
    newRow.insertTableCell(1).setText(payment.description || '');
    newRow.insertTableCell(2).setText(payment.author || '');
    newRow.insertTableCell(3).setText(payment.method || '');
  });
}

function doPost(e) {
  try {
    Logger.log("doPost started");

    // Log incoming request data
    Logger.log("Raw request data: %s", e.postData.contents);
    const requestData = JSON.parse(e.postData.contents);

    Logger.log("Parsed request data: %s", JSON.stringify(requestData));

    // Set template ID based on condition
    let templateId = '1MYzLe-RiaAeGaX0SbPNSq7X_6fw78x2sNaYrkKobwag';
    if (requestData.showPartyMessage) {
      if (requestData.venueName.includes('Tweed Heads')) {
        templateId = '162iy7XsHrX1iVV0G7NmvrRGXR6bnpkMGkVA-ByUtC78';
      } else if (requestData.venueName.includes('Mittagong')) {
        templateId = '1L2yCJRzwlJy90zMfUnotjjLTM2HeYhXeGoEiOzVsP9A';
      } else if (requestData.venueName.includes('Toowoomba')) {
        templateId = '1vxL84qB8F4NBN1p2VATWhrrHG37kFM41mPQ8PjUcY6s';
      }
    }
    Logger.log("Template ID selected: %s", templateId);

    // Create a new document from template
    const templateFile = DriveApp.getFileById(templateId);
    const newDocFile = templateFile.makeCopy();
    const doc = DocumentApp.openById(newDocFile.getId());
    const body = doc.getBody();

    Logger.log("Template copied and document opened");

    // Replace placeholders
    const replacements = {
      '{{venueName}}': requestData.venueName || '',
      '{{addressLine1}}': requestData.addressLine1 || '',
      '{{addressLine2}}': requestData.addressLine2 || '',
      '{{addressLine3}}': requestData.addressLine3 || '',
      '{{abnNumber}}': requestData.abnNumber || '',
      '{{customerName}}': requestData.customerName || '',
      '{{childsName}}': requestData.childsName || '',
      '{{childsDob}}': requestData.childsDob || '',
      '{{childTurning}}': requestData.childTurning || '',
      '{{phoneNumber}}': requestData.phoneNumber || '',
      '{{invoiceNumber}}': requestData.invoiceNumber || '',
      '{{eventDate}}': requestData.eventDate || '',
      '{{eventTime}}': requestData.eventTime || '',
      '{{totalGuests}}': requestData.totalGuests || '',
      '{{partyType}}': requestData.partyType || '',
      '{{partyCost}}': formatCurrency(requestData.partyCost || 0),
      '{{extraGuestCost}}': formatCurrency(requestData.extraGuestCost || 0),
      '{{extraGuestQuantity}}': requestData.extraGuestQuantity || '',
      '{{totalExtraGuestCost}}': formatCurrency(requestData.totalExtraGuestCost || 0),
      '{{priceSubTotal}}': formatCurrency(requestData.priceSubTotal || 0),
      '{{priceDiscount}}': formatCurrency(requestData.priceDiscount || 0),
      '{{priceTotal}}': formatCurrency(requestData.priceTotal || 0),
      '{{outstandingBalance}}': formatCurrency(requestData.outstandingBalance || 0)
    };
    for (let [key, value] of Object.entries(replacements)) {
      body.replaceText(key, value);
    }
    Logger.log("Placeholders replaced");

    // Get tables from the document
    const tables = body.getTables();
    Logger.log("Tables retrieved, count: %d", tables.length);

    // Define mainTable based on index or other logic
    const mainTableIndex = requestData.showPartyMessage ? 2 : 1;
    const mainTable = tables[mainTableIndex];
    Logger.log("Main table selected: index %d", mainTableIndex);

    // Populate tables
    insertTableData(mainTable, 'Menu:', requestData.partyFood, formatCurrency);
    insertTableData(mainTable, 'Items:', requestData.partyExtras, formatCurrency);
    insertTableData(mainTable, 'Additionals:', requestData.additionals, formatCurrency);
    Logger.log("Table data inserted");

    // Define and handle staff notes table if needed
    const staffNotesTable = tables[mainTableIndex + 2]; // Adjust index as needed
    if (requestData.staffNotes && requestData.staffNotes.length) {
      insertStaffNotes(staffNotesTable, requestData.staffNotes);
      Logger.log("Staff notes table populated");
    } else {
      body.removeChild(staffNotesTable);
      Logger.log("Staff notes table removed as no data was present");
    }

    // Define and handle payments table if needed
    const paymentsTable = tables[mainTableIndex + 3]; // Adjust index as needed
    insertPayments(paymentsTable, requestData.payments, formatCurrency);
    Logger.log("Payments table populated");

    // Remove extra empty paragraphs to avoid blank pages
    removeExtraEmptyParagraphsAfterWord(body, "Invoice #");
    Logger.log("Extra empty paragraphs removed");

    doc.saveAndClose();
    Logger.log("Document saved and closed");

    // Convert to PDF
    const pdfFile = DriveApp.getFileById(doc.getId()).getAs('application/pdf');
    DriveApp.getFileById(doc.getId()).setTrashed(true);
    const base64Pdf = Utilities.base64Encode(pdfFile.getBytes());
    Logger.log("PDF generated and encoded");

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      filename: `${requestData.filename || 'EventInvoice'}.pdf`,
      fileData: base64Pdf
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    Logger.log("Error occurred: %s", error.message);
    Logger.log("Stack trace: %s", error.stack);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}


function removeExtraEmptyParagraphsAfterWord(body, keyword) {
  const numChildren = body.getNumChildren();
  let startClearing = false; // Flag to start clearing paragraphs only after the keyword is found

  for (let i = 0; i < numChildren; i++) {
    const child = body.getChild(i);

    // Check if the current element contains the keyword
    if (child.getType() === DocumentApp.ElementType.PARAGRAPH) {
      const text = child.asParagraph().getText();

      // Once the keyword is found, start clearing paragraphs
      if (text.includes(keyword)) {
        startClearing = true;
      }

      // If startClearing is true and the paragraph is empty, clear it
      if (startClearing && text.trim() === '') {
        child.asParagraph().setText(' '); // Clear the text instead of removing the paragraph
      }
    }
  }
}


function findRow(table, searchText) {
  const numRows = table.getNumRows();
  for (let i = 0; i < numRows; i++) {
    const rowText = table.getRow(i).getCell(0).getText();
    if (rowText.includes(searchText)) {
      return i; // Return the row index
    }
  }
  return -1; // Return -1 if not found
}
