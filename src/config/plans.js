export const PLANS = [
   {
      id: "free",
      name: "Free",
      priceLabel: "0",
      theme: "light",
      colorTag: "green",
      popular: false,
      shortDesc: "Manual, basic starting point.",
      merchantExperience: "Build your menu and generate QR codes. Receive raw orders manually via WhatsApp. No dashboard tracking.",
      consumerExperience: "Scanning the QR redirects shoppers out of the browser directly into their WhatsApp app to hit send.",
      features: [
         { text: "Click-to-chat orders", active: true },
         { text: "Digital Menu", active: true },
         { text: "No auto-checkout", active: false },
         { text: "No structured receipts", active: false },
         { text: "No customer database", active: false }
      ],
      buttonLabel: "Start Free",
      buttonLink: "/request-access"
   },
   {
      id: "basic",
      name: "Basic",
      priceLabel: "999",
      theme: "dark",
      colorTag: "green",
      popular: true,
      shortDesc: "Clean orders, ready to act on.",
      merchantExperience: "Dashboard activates. Incoming Kanban board unlocks. Customer names/phones actively captured into your CRM.",
      consumerExperience: "Seamless in-browser Direct Checkout and live pulsing Order Tracker interface. No external apps.",
      features: [
         { text: "Click-to-chat orders", active: true },
         { text: "Digital Menu", active: true },
         { text: "Auto-checkout routing", active: true, strong: true },
         { text: "Structured thermal receipts", active: true, strong: true },
         { text: "Customer Identity Capture", active: true, strong: true },
         { text: "Active Order Dashboard", active: true }
      ],
      buttonLabel: "Upgrade to Basic",
      buttonLink: "/request-access"
   },
   {
      id: "pro",
      name: "Pro",
      priceLabel: "2,499",
      theme: "light_accent",
      colorTag: "blue",
      popular: false,
      shortDesc: "Order intelligence & tracking.",
      merchantExperience: "Stop manually replying. The server natively texts customers automatically. Analytics and Community Directory unlocked.",
      consumerExperience: "In-browser tracker plus instant, highly professional WhatsApp API push receipts. They see your food in their Social Feed.",
      features: [
         { text: "Click-to-chat orders", active: true },
         { text: "Digital Menu", active: true },
         { text: "Auto-checkout routing", active: true },
         { text: "Structured thermal receipts", active: true },
         { text: "Customer Identity Capture", active: true },
         { text: "Active Order Dashboard", active: true },
         { text: "Automated WhatsApp Bot", active: true, strong: true },
         { text: "Historical Analytics Tracking", active: true, strong: true },
         { text: "Community Feed Tagging", active: true }
      ],
      buttonLabel: "Get Pro",
      buttonLink: "/request-access"
   },
   {
      id: "business",
      name: "Business",
      priceLabel: "4,999",
      theme: "light",
      colorTag: "purple",
      popular: false,
      shortDesc: "For scaling operations.",
      merchantExperience: "Issue locked-down login accounts to waiters & cashiers. Automatically settle incoming cash to the till via M-Pesa.",
      consumerExperience: "Checkout triggers an instant green M-Pesa PIN prompt (STK Push) directly on their mobile screen.",
      features: [
         { text: "Click-to-chat orders", active: true },
         { text: "Digital Menu", active: true },
         { text: "Auto-checkout routing", active: true },
         { text: "Structured thermal receipts", active: true },
         { text: "Customer Identity Capture", active: true },
         { text: "Active Order Dashboard", active: true },
         { text: "Automated WhatsApp Bot", active: true },
         { text: "Historical Analytics Tracking", active: true },
         { text: "Community Feed Tagging", active: true },
         { text: "Automated STK Pushes", active: true, strong: true },
         { text: "Multi-User Seat Access", active: true, strong: true },
         { text: "Native POS API Hooks", active: true }
      ],
      buttonLabel: "Contact Sales",
      buttonLink: "/request-access"
   }
];
