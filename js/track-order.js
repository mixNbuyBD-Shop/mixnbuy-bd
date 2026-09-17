/* MIXNBUY.BD — TRACK ORDER */
document.addEventListener("DOMContentLoaded",()=>{
 const $=id=>document.getElementById(id);

 const statuses=["pending","confirmed","processing","shipped","delivered"];
 const labels={pending:"Pending",confirmed:"Confirmed",processing:"Processing",shipped:"Shipped",delivered:"Delivered",cancelled:"Cancelled",returned:"Returned"};

 const money=v=>window.MXB?.money?MXB.money(Number(v||0)):`BDT ${Number(v||0).toLocaleString("en-BD",{maximumFractionDigits:2})}`;

 function cartCount(){
  let n=0;
  try{const c=JSON.parse(localStorage.getItem("mxb_cart")||"[]");if(Array.isArray(c))n=c.reduce((s,x)=>s+Number(x.quantity||0),0)}catch{}
  document.querySelectorAll("[data-cart-count]").forEach(x=>x.textContent=n);
 }

 function show(el){el.classList.remove("hidden")}
 function hide(el){el.classList.add("hidden")}

 function safe(v){return window.MXB?.escapeHtml?MXB.escapeHtml(String(v??"")):String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}

 function formatDate(v){
  if(!v)return "—";
  const d=new Date(v); if(Number.isNaN(d.getTime()))return safe(v);
  return d.toLocaleString("en-BD",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
 }

 function imageOf(item){
  return item?.image_url || item?.image || "assets/images/product-placeholder.svg";
 }

 function normalize(data, requestedId){
  if(!data || data.success !== true) return null;

  const o=data.order || data.data?.order || data.data || data;
  if(!o || typeof o !== "object") return null;

  const returnedId=String(
    o.order_id || o.order_number || o.orderId || ""
  ).trim();

  // Never display an order when the backend did not return a real Order ID.
  if(!returnedId) return null;

  // Prevent a mismatched/garbage response from being shown as an order.
  if(String(returnedId).toUpperCase() !== String(requestedId).trim().toUpperCase()){
    return null;
  }

  return o;
 }

 function renderTimeline(status){
  const tl=$("timeline");
  const s=String(status||"pending").toLowerCase();
  if(["cancelled","returned"].includes(s)){
   tl.innerHTML=`<div class="timeline-step current"><div class="timeline-dot"><i class="bi bi-x-lg"></i></div><span>${labels[s]}</span></div>`;
   return;
  }
  const idx=statuses.indexOf(s);
  tl.innerHTML=statuses.map((x,i)=>`
   <div class="timeline-step ${i<idx?"done":i===idx?"current":""}">
    <div class="timeline-dot"><i class="bi ${i<idx?"bi-check-lg":i===idx?"bi-circle-fill":"bi-circle"}"></i></div>
    <span>${labels[x]}</span>
   </div>`).join("");
 }

 function render(order){
  $("resultOrderId").textContent=order.order_number||order.order_id||order.id||"—";
  const status=String(order.status||"pending").toLowerCase();
  $("resultStatus").textContent=labels[status]||status;
  $("customerName").textContent=order.customer_name||order.name||"—";
  $("customerMobile").textContent=order.customer_phone||order.mobile||order.phone||"—";
  $("orderDate").textContent=formatDate(order.created_at||order.order_date);
  $("orderTotal").textContent=money(order.total_amount??order.total);
  $("subtotal").textContent=money(order.subtotal);
  $("discount").textContent=`- ${money(order.discount_amount)}`;
  $("delivery").textContent=money(order.delivery_charge);
  $("totalLine").textContent=money(order.total_amount??order.total);

  $("address").textContent=[
   order.address,order.area,order.city,order.district,order.postal_code
  ].filter(Boolean).join(", ")||"—";

  const items=order.items||order.order_items||order.products||[];
  $("itemsList").innerHTML=items.length?items.map(i=>`
   <div class="track-item">
    <img src="${safe(imageOf(i))}" alt="">
    <div class="item-info">
      <strong>${safe(i.product_name||i.name||"Product")}</strong>
      <span>Qty: ${Number(i.quantity||1)} × ${money(i.unit_price??i.selling_price??i.price)}</span>
    </div>
    <strong class="item-total">${money(i.total_price??i.total??((i.unit_price??i.selling_price??i.price??0)*(i.quantity||1)))}</strong>
   </div>`).join(""):`<div class="track-item"><div class="item-info"><strong>Product details unavailable</strong></div></div>`;

  const history=order.status_history||order.order_status_history||[];
  $("historyList").innerHTML=history.length?history.map(h=>`
   <div class="history-row">
    <div class="history-icon"><i class="bi bi-check2"></i></div>
    <div><strong>${safe(labels[String(h.status||"").toLowerCase()]||h.status||"Updated")}</strong><span>${formatDate(h.created_at||h.changed_at)}</span></div>
   </div>`).join(""):`<div class="history-row"><div class="history-icon"><i class="bi bi-clock"></i></div><div><strong>${safe(labels[status]||status)}</strong><span>Current order status</span></div></div>`;

  renderTimeline(status);
  hide($("initialState")); hide($("errorState")); show($("orderResult"));
 }

 async function track(id){
  id=id.trim();
  if(!id)return;

  // MIXNBUY Order IDs are generated as MXB-YYYYMMDD-0001.
  // Reject random text before contacting the tracking service.
  const orderIdPattern=/^MXB-\d{8}-\d{4}$/i;
  if(!orderIdPattern.test(id)){
    $("errorMessage").textContent="Please enter a valid MIXNBUY Order ID, e.g. MXB-20260916-0001.";
    hide($("initialState"));
    hide($("orderResult"));
    show($("errorState"));
    return;
  }
  const btn=$("trackBtn"); btn.disabled=true; btn.innerHTML='<i class="bi bi-arrow-repeat"></i> Searching...';
  hide($("initialState"));hide($("orderResult"));hide($("errorState"));

  try{
   // Support the existing config.js naming conventions used by MIXNBUY.
   // The final fallback keeps this page working even if config.js has not
   // exposed the Track Order URL as MXB_CONFIG.TRACK_ORDER_URL yet.
   const endpoint =
     window.MXB_CONFIG?.TRACK_ORDER_URL ||
     window.MXB_CONFIG?.trackOrderUrl ||
     window.MXB_CONFIG?.FUNCTIONS?.TRACK_ORDER ||
     window.MXB_CONFIG?.functions?.trackOrder ||
     window.TRACK_ORDER_URL ||
     window.TRACK_ORDER_FUNCTION_URL ||
     "https://orecvjhywhauxmbcixhc.supabase.co/functions/v1/track-order";

   if(!endpoint)throw new Error("Track Order service is not configured.");

   const res=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({order_id:id,orderNumber:id})});
   const json=await res.json().catch(()=>null);

   // The tracking endpoint must explicitly confirm success.
   if(!res.ok || !json || json.success !== true){
     throw new Error(json?.message || "Order not found.");
   }

   const order=normalize(json,id);
   if(!order){
     throw new Error("Order not found.");
   }

   render(order);
  }catch(e){
   $("errorMessage").textContent=e.message||"Please check the Order ID and try again.";
   show($("errorState"));
  }finally{
   btn.disabled=false;btn.innerHTML='<i class="bi bi-search"></i> Track Order';
  }
 }

 $("trackForm").addEventListener("submit",e=>{e.preventDefault();track($("orderIdInput").value)});
 $("newTrackBtn").addEventListener("click",()=>{$("orderResult").classList.add("hidden");$("orderIdInput").focus();window.scrollTo({top:250,behavior:"smooth"})});

 $("searchForm")?.addEventListener("submit",e=>{
  e.preventDefault();const q=$("globalSearch").value.trim();if(q)location.href=`products.html?search=${encodeURIComponent(q)}`;
 });

 $("mobileMenuBtn")?.addEventListener("click",()=>{
  const n=$("mainNav");n?.classList.toggle("open");
  $("mobileMenuBtn").innerHTML=n?.classList.contains("open")?'<i class="bi bi-x-lg"></i>':'<i class="bi bi-list"></i>';
 });

 const initial=new URLSearchParams(location.search).get("order_id")||new URLSearchParams(location.search).get("orderId");
 if(initial){$("orderIdInput").value=initial;track(initial)}
 cartCount();
});
