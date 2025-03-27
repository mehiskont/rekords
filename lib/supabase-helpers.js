import supabase from './supabase';

/**
 * User-related operations
 */
export async function getUsers() {
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw error;
  return data;
}

export async function getUserById(id) {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function getUserByEmail(email) {
  const { data, error } = await supabase.from('users').select('*').eq('email', email).single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no rows returned
  return data;
}

/**
 * Order-related operations
 */
export async function getOrders() {
  const { data, error } = await supabase.from('orders').select('*');
  if (error) throw error;
  return data;
}

export async function getOrderById(id) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(*)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function getOrdersByUserId(userId) {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      items:order_items(*)
    `)
    .eq('user_id', userId);
  if (error) throw error;
  return data;
}

export async function createOrder(orderData) {
  // First create the order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert([{
      user_id: orderData.userId,
      status: orderData.status || 'pending',
      amount: orderData.total,
      currency: orderData.currency || 'EUR',
      payment_method: orderData.paymentMethod,
      payment_intent_id: orderData.paymentIntentId,
      email: orderData.email,
      // Add any other order fields here
    }])
    .select()
    .single();
  
  if (orderError) throw orderError;
  
  // Then create order items if they exist
  if (orderData.items && orderData.items.length > 0) {
    const orderItems = orderData.items.map(item => ({
      order_id: order.id,
      price: item.price,
      quantity: item.quantity,
      title: item.title,
      artist: item.artist,
      release_id: item.releaseId,
      discogs_listing_id: item.discogsListingId,
      // Add other order item fields
    }));
    
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);
    
    if (itemsError) throw itemsError;
  }
  
  return order;
}

/**
 * Cart-related operations
 */
export async function getCartByUserId(userId) {
  // First try to find an existing cart
  const { data: cart, error: cartError } = await supabase
    .from('carts')
    .select(`
      *,
      items:cart_items(*)
    `)
    .eq('user_id', userId)
    .single();
  
  if (cartError && cartError.code !== 'PGRST116') throw cartError;
  
  return cart;
}

export async function addToCart(userId, item) {
  // First, find or create cart
  let cart = await getCartByUserId(userId);
  
  if (!cart) {
    // Create a new cart if one doesn't exist
    const { data: newCart, error: createError } = await supabase
      .from('carts')
      .insert([{ user_id: userId }])
      .select()
      .single();
    
    if (createError) throw createError;
    cart = newCart;
  }
  
  // Check if item already exists in cart
  const { data: existingItems } = await supabase
    .from('cart_items')
    .select('*')
    .eq('cart_id', cart.id)
    .eq('discogs_listing_id', item.discogsListingId);
  
  if (existingItems && existingItems.length > 0) {
    // Update quantity if item already exists
    const { error: updateError } = await supabase
      .from('cart_items')
      .update({ quantity: existingItems[0].quantity + (item.quantity || 1) })
      .eq('id', existingItems[0].id);
    
    if (updateError) throw updateError;
  } else {
    // Add new item to cart
    const { error: addError } = await supabase
      .from('cart_items')
      .insert([{
        cart_id: cart.id,
        record_id: item.recordId,
        price: item.price,
        quantity: item.quantity || 1,
        discogs_listing_id: item.discogsListingId
      }]);
    
    if (addError) throw addError;
  }
  
  // Return updated cart
  return getCartByUserId(userId);
}

// You can add more helper functions based on your app's needs 