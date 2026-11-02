import { validateAdminRequest, sanitizeSlug } from '../middleware/security.js';

// Consolidating all admin functions into a single router to stay within Vercel Hobby limits (max 12 functions)
export default async function handler(req, res) {
  const security = await validateAdminRequest(req, res);
  if (!security) return; 

  const { adminDb, caller } = security;
  const { action } = req.query; // We'll use a query param 'action' derived from rewrites

  try {
    switch (action) {
      case 'create-community':
        return await handleCreateCommunity(req, res, adminDb);
      case 'create-shop':
        return await handleCreateShop(req, res, adminDb);
      case 'create-supplier':
        return await handleCreateSupplier(req, res, adminDb);
      case 'process-kyc':
        return await handleProcessKyc(req, res, adminDb);
      case 'process-marketplace-listing':
        return await handleProcessMarketplaceListing(req, res, adminDb);
      case 'process-upgrade':
        return await handleProcessUpgrade(req, res, adminDb);
      case 'update-shop-metadata':
        return await handleUpdateShopMetadata(req, res, adminDb);
      default:
        return res.status(404).json({ error: "Admin action not recognized." });
    }
  } catch (err) {
    console.error(`Admin API Error [${action}]:`, err);
    return res.status(500).json({ error: err.message });
  }
}

// --- HANDLERS ---

async function handleCreateCommunity(req, res, adminDb) {
  const { name, slug, description } = req.body;
  if (!name) return res.status(400).json({ error: "Missing Community Name." });
  const cleanSlug = sanitizeSlug(slug) || sanitizeSlug(name);
  const { data: community, error } = await adminDb.from('communities').insert([{ name: name.trim(), slug: cleanSlug, description: description?.trim() }]).select().single();
  if (error) throw error;
  return res.status(200).json({ success: true, message: "Community sprouted.", community });
}

async function handleCreateShop(req, res, adminDb) {
  const { shopName, ownerEmail, phone, whatsapp, industry } = req.body;
  if (!shopName || !ownerEmail) return res.status(400).json({ error: "Missing required provisioning parameters." });
  
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let tempPassword = Array.from({length: 8}, () => charset.charAt(Math.floor(Math.random() * charset.length))).join('');

  const { data: userData, error: createErr } = await adminDb.auth.admin.createUser({ email: ownerEmail.trim().toLowerCase(), password: tempPassword, email_confirm: true });
  if (createErr) throw createErr;

  const shopInsertPayload = { name: shopName.trim(), subdomain: null, phone: phone?.trim(), whatsapp_number: (whatsapp || phone || "").trim(), plan: "free", industry_type: industry, needs_password_change: true };
  const { data: shopRes, error: shopErr } = await adminDb.from('shops').insert([shopInsertPayload]).select().single();
  if (shopErr) throw shopErr;

  const targetShopId = shopRes.shop_id || shopRes.id;
  
  // V1 Compatibility Layer insert
  await adminDb.from('shop_users').insert([{ id: userData.user.id, email: ownerEmail.trim().toLowerCase(), role: "shop_owner", shop_id: targetShopId }]);
  
  // V2 Profile Upsert
  await adminDb.from('profiles').upsert({
    id: userData.user.id,
    display_name: ownerEmail.trim().toLowerCase().split('@')[0],
    system_role: 'user'
  }, { onConflict: 'id' });

  // V2 Shop Member Relationship insert
  await adminDb.from('shop_members').insert([{
    user_id: userData.user.id,
    shop_id: targetShopId,
    role: "owner",
    is_active: true
  }]);
  
  return res.status(200).json({ success: true, shop: shopRes, tempPassword });
}

async function handleCreateSupplier(req, res, adminDb) {
  const { name, industry, phone, email, mpesaShortcode, mpesaPasskey } = req.body;
  if (!name || !email) return res.status(400).json({ error: "Missing Supplier Name or Email." });

  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let tempPassword = Array.from({length: 8}, () => charset.charAt(Math.floor(Math.random() * charset.length))).join('');

  const { data: userData, error: createErr } = await adminDb.auth.admin.createUser({ email: email.trim().toLowerCase(), password: tempPassword, email_confirm: true });
  if (createErr) throw createErr;

  const { data: supplier, error: supErr } = await adminDb.from('suppliers').insert([{ id: userData.user.id, name: name.trim(), industry: industry || 'retail', contact_phone: phone?.trim(), email: email.trim().toLowerCase(), mpesa_shortcode: mpesaShortcode?.trim(), mpesa_passkey: mpesaPasskey?.trim() }]).select().single();
  if (supErr) throw supErr;

  // V2 Profile System Role Update to 'supplier'
  await adminDb.from('profiles').upsert({
    id: userData.user.id,
    display_name: name.trim(),
    system_role: 'supplier'
  }, { onConflict: 'id' });

  return res.status(200).json({ success: true, supplier, tempPassword });
}

async function handleProcessKyc(req, res, adminDb) {
  const { kycId, approved } = req.body;
  if (!kycId) return res.status(400).json({ error: "Missing KYC ID." });
  const { data: kyc, error } = await adminDb.from('shop_kyc').update({ verification_status: approved ? 'approved' : 'rejected', verified_at: new Date().toISOString() }).eq('id', kycId).select().single();
  if (error) throw error;
  return res.status(200).json({ success: true, kyc });
}

async function handleProcessMarketplaceListing(req, res, adminDb) {
  const { shopId, status } = req.body;
  if (!shopId || !status) return res.status(400).json({ error: "Missing Shop ID or status." });
  const { data: shop, error } = await adminDb.from('shops').update({ marketplace_status: status }).eq('id', shopId).select().single();
  if (error) throw error;
  return res.status(200).json({ success: true, shop });
}

async function handleProcessUpgrade(req, res, adminDb) {
  const { requestId, shopId, approved } = req.body;
  if (!requestId || !shopId) return res.status(400).json({ error: "Missing Request ID or Shop ID." });
  const { data: request, error: reqErr } = await adminDb.from('upgrade_requests').update({ status: approved ? 'approved' : 'rejected' }).eq('id', requestId).select().single();
  if (reqErr) throw reqErr;
  if (approved) {
    await adminDb.from('shops').update({ plan: request.requested_tier, subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() }).eq('id', shopId);
  }
  return res.status(200).json({ success: true, message: "Upgrade processed." });
}

async function handleUpdateShopMetadata(req, res, adminDb) {
  const { shopId, name, subdomain, phone, isSuspended, suspensionReason, plan } = req.body;
  if (!shopId) return res.status(400).json({ error: "Missing Shop ID." });
  
  const updatePayload = {};
  if (name) updatePayload.name = name.trim();
  if (phone) updatePayload.phone = phone.trim();
  if (typeof isSuspended === 'boolean') {
    updatePayload.is_suspended = isSuspended;
    updatePayload.suspension_reason = suspensionReason || (isSuspended ? "Service temporarily unavailable." : "");
  }
  if (plan) {
    updatePayload.plan = plan.toLowerCase();
    updatePayload.subscription_expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  }
  if (subdomain !== undefined) {
    updatePayload.subdomain = sanitizeSlug(subdomain);
  }

  const { data: shop, error } = await adminDb.from('shops').update(updatePayload).eq('id', shopId).select().single();
  if (error) throw error;
  return res.status(200).json({ success: true, shop });
}
