const TERMS_VERSION = 'owner-v1';

const OWNER_TERMS_TEMPLATE = `PROPERTY LISTING TERMS & CONDITIONS (Hyderabad)
Version: ${TERMS_VERSION}

1. Accuracy of information
The Property Owner confirms that all details provided (title, type, price, size, location, photos, and notes) are true and complete to the best of their knowledge. The Owner will update or withdraw the listing if material facts change.

2. Ownership and authority
The Owner warrants they are the lawful owner of the property or are duly authorized to list it for Sale / Rent / Lease. The Owner is solely responsible for clear title, encumbrances, and legal compliance.

3. Listing purpose
This listing is published on RealCRM for genuine Sale, Rent, or Lease. The Owner will not use the platform for spam, fraud, or misleading marketing.

4. Optional “via Agent” note
If the Owner marks the listing as “listed via agent”, this is an informational flag only. It does not appoint, bind, or create a brokerage agreement with any specific agent on RealCRM unless a separate written agreement is made offline.

5. Photos and media
The Owner grants RealCRM a non-exclusive right to display uploaded photos and listing details to users of the platform. The Owner confirms they have rights to all uploaded media and that images fairly represent the property.

6. Pricing and negotiations
Displayed price is indicative. Final commercial terms (sale consideration, rent, lease deposit, lock-in, maintenance, brokerage if any) are agreed between the parties offline. RealCRM is not a party to any transaction.

7. Compliance
The Owner will comply with applicable Indian laws including RERA (where applicable), local municipal rules, and tax obligations related to the transaction.

8. Liability
RealCRM provides a matching/listing tool and is not liable for disputes, losses, or damages arising from negotiations, site visits, or completed deals between Owner, buyers/tenants, or agents.

9. Withdrawal
The Owner may unpublish or delete the listing at any time. Published listings may remain visible until withdrawn.

10. Acceptance
By publishing this listing, the Owner accepts these Terms & Conditions as edited (if any) in the listing form.`;

function getOwnerTermsTemplate(listingType = 'Sale') {
  const typeLine = `\n\nSelected listing type: ${listingType}. Adjust commercial clauses above as needed before publishing.`;
  return {
    version: TERMS_VERSION,
    text: OWNER_TERMS_TEMPLATE + typeLine,
  };
}

module.exports = { TERMS_VERSION, OWNER_TERMS_TEMPLATE, getOwnerTermsTemplate };
