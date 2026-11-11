# TMS Merchant Onboarding, KYC Framework & Fee Acceptance Agreement
**Contract Identifier:** `TMS-MERCHANT-LEGAL-2026-V1`  
**Platform Operator:** The Modern Savannah Platform Ecosystem (TMS)  
**Governing Laws:** Republic of Kenya (Companies Act 2015, Consumer Protection Act 2012, Kenya Data Protection Act 2019)

---

## 1. Industry-Specific Know Your Customer (KYC) Requirements

No merchant account shall be verified or permitted to receive commercial payouts on `shop.tmsavannah.com` without submitting verified digital copies of the following statutory documents:

### Category A: Food, Dining, Bakeries & Hospitality (e.g. *Leah's Kitchen, Brunchbox*)
1. **Medical Food Handlers Certificates:** Current medical examination certificate (Form B) for all kitchen staff, cooks, and food handlers, issued under the **Public Health Act (Cap 242)**. Valid for 6 months from date of issuance.
2. **County Government Single Business Permit (SBP):** Valid business license from Nairobi City County (or jurisdiction of operation) authorizing food preparation and service.
3. **Public Health Food Hygiene Inspection Certificate:** Current public health inspection clearance for kitchen premises.
4. **KRA PIN Certificate:** Personal or corporate Kenya Revenue Authority PIN certificate with VAT/Income Tax obligations active.
5. **National ID / Passport Copies:** Clear color scan of National ID card or valid Passport for business owner(s) / directors.
6. **Business Registration Certificate:** Certificate of Registration of Business Name (BN) or Certificate of Incorporation (PVT).

### Category B: Artisan Crafts, Textiles & Retail (e.g. *Creative Galore, Savannah Atelier*)
1. **Business Registration Certificate:** Valid BN or PVT certificate registered under BRS (Business Registration Service).
2. **KRA PIN Certificate:** Tax compliance certificate or verified PIN certificate.
3. **National ID / Alien ID / Passport Copies:** Authorized signatory identity documentation.
4. **Physical Atelier / Storefront Verification:** Utility bill (water/electricity) or lease agreement confirming physical operating address in Kenya.
5. **Brand & IP Authorization:** Declaration confirming ownership or legitimate distributorship of all listed craft items, yarn brands, and merchandise.

### Category C: Commute, Shuttles & Fleet Logistics (e.g. *Savannah Commute*)
1. **NTSA PSV Compliance Certificate:** National Transport and Safety Authority clearance.
2. **Road Service License (RSL):** Operating license for designated passenger routes.
3. **Vehicle Commercial Inspection Certificate:** Valid motor vehicle inspection report.
4. **Driver Credentials:** Valid PSV badge, National Driving License (Class B/C/D), and Police Clearance Certificate (Certificate of Good Conduct) for all drivers.

### Category D: Sports & Wellness Facilities (e.g. *Tennis Suite*)
1. **Facility Public Liability Insurance:** Current insurance policy covering participant injury and property damage.
2. **Single Business Permit:** Recreational and sports facility operational permit.
3. **Coach / Instructor Certifications:** Recognized federation coaching credentials for private coaching staff.
4. **Participant Waiver Framework:** Executed platform legal indemnity waiver.

---

## 2. Platform Revenue Model & Fee Structure

### 2.1 One-Off Onboarding & Setup Fee
* **Amount:** **KES 3,500.00** (Discounted to KES 0 during promotional pilot cohort).
* **Deliverables Included:**
  - Full digital storefront deployment on `shop.tmsavannah.com/s/<slug>`.
  - Authoritative database menu ingestion with UUID allocation.
  - Physical acrylic UV-printed QR table/counter standees with scratch-resistant coating.
  - Ops WhatsApp dispatch bot pairing with kitchen/manager lines.
  - Initial 1-on-1 staff training on order acceptance and dispatch.

### 2.2 Commercial Commission Structure
TMS operates on a transparent, success-based commission deducted automatically from gross merchant sales:

| Industry Sector | Standard Platform Commission | Premium / Managed Delivery Commission |
| :--- | :--- | :--- |
| **Dining, Kitchens & Quick-Serve** | **6.5% of GMV** | **10.0% of GMV** (includes dispatch coordination) |
| **Artisan Crafts & Retail** | **4.5% of GMV** | **7.5% of GMV** |
| **Commute & Transit Passes** | **3.0% of Fare Value** | N/A |
| **Sports & Court Bookings** | **5.0% of Booking Total** | N/A |

### 2.3 Transaction Fee & M-Pesa Tariff Allocation
1. **KES 1 to KES 500 (Free Regime):** Transactions within this band carry KES 0 Safaricom till receiving charge. Zero transaction fee is passed to merchant.
2. **KES 501 and Above:** Incur standard Safaricom Lipa na M-Pesa merchant tariffs. The exact statutory carrier fee is deducted at settlement.

---

## 3. Payout Structure & Financial Settlement Terms

1. **Settlement Frequency:** **Daily T+1 Settlement** (Orders placed on Monday settle on Tuesday).
2. **Daily Accounting Cutoff:** **10:00 AM EAT**. All completed orders from the preceding 24-hour cycle are compiled into the morning payout digest.
3. **Payout Disbursal Method:**
   - Automated M-Pesa B2C Payout directly to merchant's registered business mobile number, OR
   - Pesalink / KEPSS bank transfer to merchant's verified corporate bank account.
4. **Minimum Payout Threshold:** KES 500.00. Balances below threshold roll forward to the subsequent business day.
5. **Automatic Deduction Priority:** Daily payouts automatically deduct:
   $$\text{Net Merchant Payout} = \text{Gross Orders} - \text{Platform Commission} - \text{Safaricom Tariffs} - \text{Penalties / Approved Refunds}$$

---

## 4. Merchant Fee Acceptance Agreement (Binding Contract)

By checking *"I Accept Merchant Terms"* during onboarding or operating a live storefront on `shop.tmsavannah.com`, the Merchant solemnly covenants and agrees:

1. **Consent to Deductions:** The Merchant expressly authorizes TMS to automatically deduct agreed platform commissions, carrier transaction fees, and customer refund allowances from gross order proceeds prior to releasing net daily payouts.
2. **Pricing Parity:** The Merchant agrees that prices listed on their TMS digital storefront shall not exceed prices charged to walk-in counter customers for identical menu items.
3. **Dispute Arbitration:** The Merchant accepts the 3-Way Audit Trail (chat logs, till relay SMS receipts, and rider telemetry) as the final, authoritative source of truth for dispute arbitration.
4. **Indemnification:** The Merchant indemnifies and holds harmless TMS against all claims, public health fines, customer food poisoning claims, tax liabilities, or regulatory penalties arising from merchant's goods or service failures.
5. **Termination:** Either party may terminate storefront operation upon **14 business days** written notice, subject to full settlement of all pending customer orders and outstanding account balances.
