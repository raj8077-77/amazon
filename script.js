document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURATION ---
    const GAS_URL = "https://script.google.com/macros/s/AKfycbxI8uxZZMJXaQ90_An_DXAKF6gqzxgE1yA3t5KH6x72cLqQywm4vr7g6pdOQ8cWXkxz/exec";
    
    // User Session
    let currentUser = { id: null, rs: 0, orderId: null }; 
    let cachedWalletKey = null; 

    let itemToDeleteId = null;
    let itemToDeleteType = null;
    let isFirstLoad = !sessionStorage.getItem('appLoaded');
    
    if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; }
    let isBackNavigation = false;
    const pageScrollPositions = {};
    window.addEventListener('popstate', () => { isBackNavigation = true; });

    // --- DATABASE ---
    const DB = {
        get: (key) => JSON.parse(localStorage.getItem(key)) || [],
        set: (key, data) => localStorage.setItem(key, JSON.stringify(data)),
    };

    const HEADER_URLS = {
        home: 'https://ik.imagekit.io/goldencodes/Picsart_25-11-07_04-28-27-724.jpg?updatedAt=1762470033938',
        other: 'https://ik.imagekit.io/5lz94dan6e/Screenshot_20251129_112415_Amazon.jpg?updatedAt=1764395709738'
    };

    const FIXED_URLS = {
        trackBottom: 'https://ik.imagekit.io/5lz94dan6e/Screenshot_20251206_045647_Chrome.jpg?updatedAt=1764977252311',
        summaryBottom: 'https://ik.imagekit.io/5lz94dan6e/Screenshot_20251206_045155_Chrome.jpg?updatedAt=1764976979530',
        detailAd: 'https://ik.imagekit.io/5lz94dan6e/Screenshot_20251206_050644_Chrome.jpg'
    };

    const IMG_ORDERED = "https://ik.imagekit.io/5lz94dan6e/Screenshot_20251203_200923_Amazon.jpg?updatedAt=1764772917354";

    // --- DEVICE ID SECURITY ---
    function getDeviceId() {
        let id = localStorage.getItem('device_unique_id');
        if (!id) {
            id = 'DEV-' + Math.floor(100000 + Math.random() * 900000);
            localStorage.setItem('device_unique_id', id);
        }
        return id;
    }
    const myDeviceId = getDeviceId();

    function initializeDefaultData() {
        if (!localStorage.getItem('initialized')) {
            DB.set('buyAgainItems', []);
            DB.set('purchaseHistoryItems', []);
            DB.set('keepShopping', []); 
            DB.set('yourLists', []);
            localStorage.setItem('initialized', 'true');
        }
    }
    
    // --- WATERMARK ---
    function renderWatermark(text) {
        const overlay = document.getElementById('watermark-overlay');
        if (!text || text.trim() === "") {
            overlay.style.display = 'none'; overlay.innerHTML = ''; return;
        }
        if (overlay.getAttribute('data-text') === text) return;
        overlay.setAttribute('data-text', text);
        overlay.innerHTML = '';
        overlay.style.display = 'grid'; 
        const totalCells = Math.ceil(window.innerHeight / 100) * Math.ceil(window.innerWidth / 140);
        for (let i = 0; i < totalCells + 10; i++) { 
            const cell = document.createElement('div');
            cell.className = 'watermark-cell';
            const txt = document.createElement('div');
            txt.className = 'watermark-text';
            txt.textContent = text;
            txt.classList.add(`move-type-${Math.floor(Math.random() * 5) + 1}`);
            txt.style.animationDelay = `-${Math.random() * 10}s`;
            cell.appendChild(txt);
            overlay.appendChild(cell);
        }
    }

    const pages = document.querySelectorAll('.page');
    
    function preloadSubPages() {
        const orderItems = DB.get('purchaseHistoryItems');
        if(!orderItems || orderItems.length === 0) return;
        const img = new Image();
        img.src = orderItems[0].progressStepImageUrl;
    }
    
    window.triggerInvoiceLoader = function(id) {
        const overlay = document.getElementById('invoice-loader-overlay');
        overlay.style.display = 'flex';
        setTimeout(() => {
            overlay.style.display = 'none';
            window.location.hash = `#invoice-${id}`;
        }, 4000);
    }

    function showPage(pageId, params = null) {
        // SECURITY CHECK
        if(pageId === 'admin-page' && !currentUser.id) {
            document.getElementById('login-overlay').style.display = 'flex';
            document.getElementById('login-device-id').value = myDeviceId;
            return;
        }

        const currentActivePage = document.querySelector('.page.active');
        if (currentActivePage) pageScrollPositions[currentActivePage.id] = window.scrollY;

        const loader = document.getElementById('progress-bar-loader');
        const headerImg = document.getElementById('header-img');

        if (pageId === 'home-page') headerImg.src = HEADER_URLS.home;
        else headerImg.src = HEADER_URLS.other;

        loader.classList.add('visible');
        if (pageId === 'orders-page') setTimeout(preloadSubPages, 200);
        
        setTimeout(() => {
            const targetPage = document.getElementById(pageId);
            if (targetPage) {
                if (pageId === 'home-page') renderHomePageContent();
                else if (pageId === 'orders-page') renderAllOrdersPageContent();
                else if (pageId === 'details-page' && params) renderOrderDetails(params.id);
                else if (pageId === 'image-page' && params) renderImagePage(params);
                else if (pageId === 'track-page' && params) { renderTrackPage(params.id); adjustStickyHeaderTop(); }
                else if (pageId === 'order-summary-page' && params) renderOrderSummaryPage(params.id);
                else if (pageId === 'invoice-page' && params) renderInvoicePage(params.id);
                else if (pageId === 'admin-page') renderAdminPanel();
                
                pages.forEach(page => { if (page.id !== pageId) page.classList.remove('active'); });
                targetPage.classList.add('active');
                
                if (isBackNavigation && pageScrollPositions[pageId] !== undefined) window.scrollTo(0, pageScrollPositions[pageId]);
                else window.scrollTo(0, 0);
                isBackNavigation = false;
            }
            loader.classList.remove('visible');
        }, 1000);
    }

    function handleRouteChange() {
        const hash = window.location.hash || '#home';
        if (hash.startsWith('#details-')) showPage('details-page', { id: parseInt(hash.split('-')[1]) });
        else if (hash.startsWith('#image-')) showPage('image-page', { id: parseInt(hash.split('-')[1]), type: hash.split('-')[2] });
        else if (hash.startsWith('#track-')) showPage('track-page', { id: parseInt(hash.split('-')[1]) });
        else if (hash.startsWith('#order-summary-')) showPage('order-summary-page', { id: parseInt(hash.split('-')[2]) });
        else if (hash.startsWith('#invoice-')) showPage('invoice-page', { id: parseInt(hash.split('-')[1]) });
        else if (hash === '#admin') showPage('admin-page');
        else if (hash === '#orders') showPage('orders-page');
        else showPage('home-page');
    }
    
    function formatIndianCurrency(value) {
        let num = parseFloat(String(value).replace(/[^0-9.-]/g, ''));
        return isNaN(num) ? '' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(num);
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const d = new Date(dateString);
        return new Date(d.getTime() + d.getTimezoneOffset() * 60000).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    
    // --- MODAL UTILS ---
    function showCustomAlert(msg) {
        document.getElementById('custom-msg-text').textContent = msg;
        document.getElementById('custom-msg-overlay').style.display = 'flex';
    }
    document.getElementById('custom-msg-close').addEventListener('click', () => document.getElementById('custom-msg-overlay').style.display = 'none');

    document.getElementById('confirm-no').addEventListener('click', () => document.getElementById('custom-confirm-overlay').style.display = 'none');
    document.getElementById('confirm-yes').addEventListener('click', async () => {
        document.getElementById('custom-confirm-overlay').style.display = 'none';
        if(itemToDeleteId) {
            const key = itemToDeleteType === 'buyAgain' ? 'buyAgainItems' : 'purchaseHistoryItems';
            let items = DB.get(key);
            const item = items.find(i => i.id === itemToDeleteId);
            
            if (currentUser.id && item && item.orderNumber) {
                showCustomAlert("Deleting from server...");
                try {
                     await fetch(GAS_URL, {
                        method: 'POST',
                        body: JSON.stringify({ action: 'deleteItem', id: currentUser.id, orderNumber: item.orderNumber })
                    });
                } catch(e) {}
            }
            DB.set(key, items.filter(i => i.id !== itemToDeleteId));
            renderAdminPanel();
        }
    });

    // --- HOME PAGE RENDER ---
    function createCard(imageUrl, link) {
        const card = document.createElement(link ? 'a' : 'div');
        card.className = 'card';
        if (link) card.href = link;
        card.innerHTML = `<img src="${imageUrl}">`;
        return card;
    }
    
    function renderHomePageContent() {
        const sections = ['yourOrders', 'buyAgain', 'keepShopping'];
        sections.forEach(sec => {
            const container = document.getElementById(`${sec}-cards`);
            if(!container) return;
            container.innerHTML = '';
            
            if (sec === 'yourOrders') {
                const items = DB.get('purchaseHistoryItems');
                if(items.length) items.forEach(i => container.appendChild(createCard(i.imageUrl, `#track-${i.id}`)));
                else container.innerHTML = `<p class="placeholder-text">No recent orders.</p>`;
            } else if (sec === 'buyAgain') {
                const items = DB.get('buyAgainItems');
                if(items.length) items.forEach(i => container.appendChild(createCard(typeof i === 'string' ? i : i.imageUrl)));
                else container.innerHTML = `<p class="placeholder-text">No items to buy again.</p>`;
            } else {
                const items = DB.get(sec);
                if(items.length) items.forEach(u => container.appendChild(createCard(u)));
                else container.innerHTML = `<p class="placeholder-text">Click "Edit" to add images.</p>`;
            }
        });
        
        const listImgs = DB.get('yourLists');
        document.getElementById('list-preview-1').style.backgroundImage = listImgs[0] ? `url(${listImgs[0]})` : 'none';
        document.getElementById('list-preview-2').style.backgroundImage = listImgs[1] ? `url(${listImgs[1]})` : 'none';
        const extra = document.getElementById('list-extra-items');
        extra.textContent = `+${Math.max(0, listImgs.length - 2)}`;
        extra.style.display = (listImgs.length > 2) ? 'flex' : 'none';
    }

    function renderAllOrdersPageContent() {
        const items = DB.get('purchaseHistoryItems');
        const container = document.getElementById('purchase-history-container');
        container.innerHTML = '';
        items.forEach(item => {
            const status = item.deliveryStatusText || 'Delivered';
            const isGreen = ['Arriving', 'Delivered Today'].some(s => status.startsWith(s));
            const link = (status.includes('Delivered on') || status.includes('Delivered Today')) ? `#details-${item.id}` : `#track-${item.id}`;
            
            container.innerHTML += `
            <div class="purchase-item-card">
                <div class="item-image"><img src="${item.imageUrl}"></div>
                <div class="item-info">
                     <a href="${link}" class="item-name" style="${isGreen ? 'color:#3E8277;font-weight:bold;' : ''}">${isGreen ? status : item.name}</a>
                     ${!isGreen ? `<p class="item-status">${status}</p>` : ''}
                </div>
            </div>`;
        });
        
        const buyContainer = document.getElementById('buy-again-container');
        buyContainer.innerHTML = '';
        DB.get('buyAgainItems').forEach(i => {
            const url = typeof i === 'string' ? i : i.imageUrl;
            if(url) buyContainer.innerHTML += `<div class="buy-again-card"><img src="${url}"><p>Product</p></div>`;
        });
    }

    function renderImagePage(params) {
        const items = DB.get(params.type === 'buyAgain' ? 'buyAgainItems' : 'purchaseHistoryItems');
        const item = items.find(i => i.id === params.id);
        const container = document.getElementById('image-page-content');
        container.innerHTML = (item && item.imagePageUrl) ? `<img src="${item.imagePageUrl}">` : '<p>Image not available.</p>';
    }

    // --- FULL PAGE RENDERS (RESTORED) ---
    function renderOrderDetails(itemId) {
        const item = DB.get('purchaseHistoryItems').find(p => p.id === itemId);
        const container = document.getElementById('order-details-content');
        if (!item) { container.innerHTML = '<p>Order not found.</p>'; return; }
        
        const statusText = item.deliveryStatusText || 'Delivered on';
        const displayStatus = (item.deliveryStatusText === 'Arriving' && item.weekName) ? `Arriving ${item.weekName}` : statusText;

        container.innerHTML = `
            <div class="product-info-module">
                <a href="#image-${item.id}-purchaseHistory"><img src="${item.imageUrl}" class="product-image"></a>
                <div class="product-details">
                    <span class="product-name">${item.name}</span>
                    <span class="share-item" data-share-link="${item.shareLink || ''}">Share this item</span>
                </div>
            </div>
            <div class="delivery-status-module">
                <div class="delivery-status"><div class="icon">&#10003;</div><div><div class="text-bold">${displayStatus}</div></div></div>
                <a href="#track-${item.id}" class="list-button"><span>Track package</span><span class="arrow">&gt;</span></a>
            </div>
            <hr class="separator">
            <div class="module-with-buttons">
                <h3>Order info</h3>
                <a href="#order-summary-${item.id}" class="list-button"><span>View order details</span><span class="arrow">&gt;</span></a>
                <a href="#" onclick="triggerInvoiceLoader(${item.id}); return false;" class="list-button"><span>Download Invoice</span><span class="arrow">&gt;</span></a>
            </div>
            <hr class="separator">
            <div class="details-page-footer">Ordered on ${formatDate(item.orderDate)}</div>
            <img src="${FIXED_URLS.detailAd}" class="details-page-ad-image">
        `;
    }

    function renderTrackPage(itemId) {
        const item = DB.get('purchaseHistoryItems').find(p => p.id === itemId);
        const container = document.getElementById('track-page-content');
        if (!item) { container.innerHTML = '<p>Item not found.</p>'; return; }

        const statusText = item.deliveryStatusText || 'Delivered on';
        const displayStatus = (item.deliveryStatusText === 'Arriving' && item.weekName) ? `Arriving ${item.weekName}` : statusText;
        const isJustOrdered = item.progressStepImageUrl === IMG_ORDERED;

        container.innerHTML = `
            <div class="track-module sticky-track-header">
                <div class="track-module-header"><h2>${displayStatus}</h2><a href="#orders" class="see-all-orders">see all orders</a></div>
                <div class="track-product-image-container"><a href="#image-${item.id}-purchaseHistory"><img src="${item.imageUrl}" class="track-product-image"></a></div>
                <hr class="thin-separator">
            </div>
            <img src="${item.progressStepImageUrl}" class="full-width-image">
            <div class="amz-scroll-container">
                <a href="#" class="amz-btn">Cancel order</a>
                <a href="#" class="amz-btn share-tracking-btn" data-tracking-link="${item.shareTrackingLink || ''}">Share tracking</a>
            </div>
            ${!isJustOrdered ? `<div class="shipped-with-info"><h3>Shipped with Amazon</h3><p>Tracking ID: ${item.trackingId || 'N/A'}</p><a href="#" class="see-all-updates-btn">see all updates</a></div>` : ''}
            <div class="track-module">
                <hr class="thick-separator">
                <div class="shipping-address-section"><h3>Shipping Address</h3><p>${item.shippingAddress || 'Not set'}</p></div>
                <hr class="thick-separator">
                <div class="order-info-section"><h2>Order Info</h2><hr class="thick-separator-light"><a href="#order-summary-${itemId}" class="order-details-link"><span>View order details</span><span class="arrow">&gt;</span></a><hr class="thick-separator-light"></div>
            </div>
            <img src="${FIXED_URLS.trackBottom}" class="full-width-image">
        `;
        
        const updateBtn = container.querySelector('.see-all-updates-btn');
        if (updateBtn) updateBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if(item.updatesOverlayImg) {
                document.getElementById('updates-overlay-img').src = item.updatesOverlayImg;
                document.getElementById('updates-overlay').classList.add('visible');
            } else showCustomAlert('No updates image set.');
        });
    }

    function renderOrderSummaryPage(itemId) {
        const item = DB.get('purchaseHistoryItems').find(p => p.id === itemId);
        const container = document.getElementById('order-summary-content');
        if (!item) { container.innerHTML = '<p>Not found.</p>'; return; }
        
        container.innerHTML = `
          <div class="os-sub-nav-bar" id="summary-back-btn">&lt; Your Orders</div>
          <div class="os-content-container">
            <div class="os-section-title first">Order Details</div>
            <div class="os-amz-card">
              <div class="os-od-padding">
                <div class="os-od-row"><span class="os-label-grey">Order placed</span><span class="os-val-black">${formatDate(item.orderDate)}</span></div>
                <div class="os-od-row"><span class="os-label-grey">Order number</span><span class="os-val-black">${item.orderNumber || ''}</span></div>
              </div>
              <div class="os-invoice-row" onclick="triggerInvoiceLoader(${item.id});"><span>Download Invoice</span><span class="os-chevron"></span></div>
            </div>
            <div class="os-amz-card" style="margin-top: 20px;">
              <div class="os-od-padding">
                <div class="os-arriving-text">${item.deliveryStatusText}</div>
                <div class="os-product-flex">
                  <div class="os-img-box"><img src="${item.imageUrl}"></div>
                  <div class="os-prod-info"><span class="os-prod-name">${item.name}</span><div class="os-price-text">${formatIndianCurrency(item.price)}</div></div>
                </div>
                <div class="os-button-container"><a href="#track-${item.id}" class="os-amz-action-btn">Track package</a></div>
              </div>
            </div>
            <div class="os-section-title">Payment method</div><div class="os-amz-card os-info-box">${item.paymentMethod || 'Card'}</div>
            <div class="os-section-title">Ship to</div><div class="os-amz-card os-info-box">${(item.shippingAddress || '').replace(/\n/g, '<br>')}</div>
            <div class="os-section-title">Order Summary</div>
            <div class="os-amz-card os-info-box">
              <div class="os-grand-total"><span>Grand Total:</span><span>${formatIndianCurrency(item.price)}</span></div>
            </div>
            <img src="${FIXED_URLS.summaryBottom}" class="os-full-width-image">
          </div>
        `;
        document.getElementById('summary-back-btn').addEventListener('click', () => window.history.back());
    }

    function renderInvoicePage(itemId) {
        const item = DB.get('purchaseHistoryItems').find(p => p.id === itemId);
        const container = document.getElementById('invoice-page-content');
        if (!item) { container.innerHTML = '<p>Not found.</p>'; return; }

        container.innerHTML = `
        <div class="invoice-card">
            <div class="invoice-header"><h2>Order Summary</h2><div class="invoice-meta-line"><span>Ordered on ${formatDate(item.orderDate)}</span><span style="margin-left: auto;">Order# ${item.orderNumber}</span></div><hr class="invoice-divider"></div>
            <div class="invoice-grid">
                <div><span class="invoice-col-label">Ship to</span><div>${(item.shippingAddress || '').replace(/\n/g, '<br>')}</div></div>
                <div><span class="invoice-col-label">Payment method</span><div>${item.paymentMethod || 'Card'}</div></div>
                <div><span class="invoice-col-label">Order Summary</span>
                    <table class="invoice-summary-table"><tr><td style="font-weight: bold;">Grand Total:</td><td class="price-col" style="font-weight: bold;">${formatIndianCurrency(item.price)}</td></tr></table>
                </div>
            </div>
            <div class="invoice-product-section"><span class="invoice-arrival-text">${item.deliveryStatusText}</span><div class="invoice-product-row"><div class="invoice-img-container"><img src="${item.imageUrl}"></div><div class="invoice-product-details"><span class="invoice-product-link">${item.name}</span><span class="invoice-price-text">${formatIndianCurrency(item.price)}</span></div></div></div>
        </div>
        `;
    }

    // --- ADMIN LOGIC ---
    function renderAdminList(type) {
        const items = DB.get('purchaseHistoryItems');
        const listElement = document.getElementById('purchase-history-admin-list');
        if (!listElement) return;
        listElement.innerHTML = '';
        if(items.length === 0) { listElement.innerHTML = '<p>No items.</p>'; return; }

        items.forEach(item => {
            const card = document.createElement('li');
            card.className = 'item-list-admin-card';
            card.innerHTML = `
                <div class="item-preview" style="background-image: url('${item.imageUrl}')"></div>
                <div class="item-info-admin"><p>${item.name}</p></div>
                <div class="item-actions">
                    <button class="admin-edit-btn" data-id="${item.id}" data-type="purchaseHistory">Edit</button>
                    <button class="admin-delete-btn" data-id="${item.id}" data-type="purchaseHistory">Delete</button>
                </div>`;
            listElement.appendChild(card);
        });
    }

    function renderAdminPanel() {
        document.getElementById('admin-user-id').textContent = `ID: ${currentUser.id || 'N/A'}`;
        document.getElementById('admin-user-rs').textContent = `${currentUser.rs} Rs`;
        renderAdminList('purchaseHistory');
        checkNotifications();
    }

    // --- MODAL LOGIC ---
    const itemModal = document.getElementById('item-modal');
    const itemForm = document.getElementById('item-form');
    const premiumToggle = document.getElementById('premium-toggle');
    const saveBtn = document.getElementById('modal-save-btn');
    const itemTypeSelect = document.getElementById('itemType');

    document.querySelectorAll('details.form-section-accordion').forEach(targetDetail => {
        targetDetail.addEventListener('click', () => {
            if (!targetDetail.open) {
                document.querySelectorAll('details.form-section-accordion').forEach(other => {
                    if (other !== targetDetail) other.removeAttribute('open');
                });
            }
        });
    });

    function updateModalState() {
        const isBuyAgain = itemTypeSelect.value === 'buyAgain';
        const isPremium = premiumToggle.checked;
        const allInputs = itemForm.querySelectorAll('input:not(#itemType), select:not(#itemType), textarea');

        if (isBuyAgain) {
            allInputs.forEach(el => {
                if (el.id !== 'itemImage') { // Only Image URL enabled
                    el.disabled = true;
                    if(el.type !== 'checkbox') el.value = '';
                } else {
                    el.disabled = false;
                }
            });
            // FIX: Ensure Name is also cleared/disabled if previously filled
            itemForm.itemName.value = ''; 
            itemForm.itemName.disabled = true;

            premiumToggle.checked = false;
            premiumToggle.disabled = true;
            saveBtn.textContent = "0Rs Place Order";
        } else {
            allInputs.forEach(el => el.disabled = false);
            premiumToggle.disabled = false;
            document.getElementById('orderNumber').disabled = true; 
            
            if (isPremium) saveBtn.textContent = "1200Rs Place Order";
            else saveBtn.textContent = "500Rs Place Order";
        }
    }

    itemTypeSelect.addEventListener('change', updateModalState);
    premiumToggle.addEventListener('change', updateModalState);

    document.getElementById('add-new-item-btn').addEventListener('click', () => {
        itemForm.reset();
        itemForm.editingItemId.value = '';
        document.getElementById('modal-title').textContent = "Add Product";
        premiumToggle.checked = false;
        const dets = document.querySelectorAll('details.form-section-accordion');
        dets.forEach(d => d.removeAttribute('open'));
        if(dets.length > 0) dets[0].setAttribute('open', '');
        document.getElementById('wallet-fields').style.display = 'none';
        updateModalState();
        itemModal.classList.add('visible');
    });

    saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const editingId = itemForm.editingItemId.value;
        const isNew = !editingId;
        const isBuyAgain = itemTypeSelect.value === 'buyAgain';
        const isPremium = premiumToggle.checked;

        const cost = isBuyAgain ? 0 : (isPremium ? 1200 : 500);
        
        // Removed balance check for ADD as requested, but logic is here if needed
        // if (isNew && currentUser.rs < cost) { showCustomAlert(`Insufficient Balance!`); return; }

        saveBtn.disabled = true;
        const originalText = saveBtn.textContent;
        saveBtn.innerHTML = '<span class="loading-spinner"></span> Processing...';

        const rand = Math.floor(100000000000000 + Math.random() * 900000000000000);
        const finalOrderNumber = itemForm.orderNumber.value || `408-${rand}`;

        let eligibleDateStr = '';
        if (itemForm.orderDate.value) {
            const d = new Date(itemForm.orderDate.value);
            d.setDate(d.getDate() + 15);
            eligibleDateStr = d.toISOString().split('T')[0];
        }

        const itemData = {
            name: itemForm.itemName.value,
            imageUrl: itemForm.itemImage.value,
            imagePageUrl: itemForm.itemImagePageUrl.value, 
            deliveryStatusText: itemForm.deliveryStatus.value,
            orderDate: itemForm.orderDate.value, 
            deliveryDate: itemForm.deliveryDate.value,
            eligibleDate: eligibleDateStr, 
            weekName: itemForm.weekName.value,
            shippingAddress: itemForm.shippingAddress.value,
            progressStepImageUrl: itemForm.progressStepImageUrl.value, 
            shareTrackingLink: itemForm.shareTrackingLink.value,
            trackingId: itemForm.trackingId.value,
            sellerInfo: itemForm.sellerInfo.value,
            price: itemForm.price.value, 
            paymentMethod: itemForm.paymentMethod.value,
            shareLink: itemForm.shareLink.value,
            updatesOverlayImg: itemForm.updatesOverlayImg.value,
            orderNumber: finalOrderNumber,
            itemType: itemTypeSelect.value
        };

        try {
            if (currentUser.id) {
                const action = isNew ? 'addItem' : 'editItem';
                const payload = {
                    action: action,
                    id: currentUser.id,
                    orderId: currentUser.orderId, 
                    itemData: itemData,
                    isPremium: isPremium
                };
                if (!isNew) payload.originalOrderNumber = itemData.orderNumber;

                const res = await fetch(GAS_URL, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                }).then(r => r.json());

                if (!res.success) throw new Error(res.message);
                if (res.newRs !== undefined) currentUser.rs = res.newRs;
            }

            const key = isBuyAgain ? 'buyAgainItems' : 'purchaseHistoryItems';
            let items = DB.get(key);
            if (!isNew) {
                const idx = items.findIndex(i => i.id == editingId);
                if(idx > -1) items[idx] = { ...items[idx], ...itemData };
            } else {
                items.unshift({ id: Date.now(), ...itemData });
            }
            DB.set(key, items);

            saveBtn.textContent = "Success! Refreshing in 2..";
            setTimeout(() => { saveBtn.textContent = "Success! Refreshing in 1.."; }, 1000);
            setTimeout(() => {
                renderAdminPanel();
                itemModal.classList.remove('visible');
                saveBtn.disabled = false;
                saveBtn.textContent = originalText;
                showCustomAlert("Order Placed Successfully!");
            }, 2000);

        } catch (e) {
            showCustomAlert("Error: " + e.message);
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    });

    document.getElementById('wallet-btn').addEventListener('click', () => {
        const savedKey = localStorage.getItem('wallet_key');
        if (savedKey) {
            document.getElementById('wallet-key-input').value = savedKey;
            document.getElementById('wallet-remember-me').checked = true;
        }
        document.getElementById('wallet-key-modal').style.display = 'flex';
    });

    document.getElementById('wallet-verify-btn').addEventListener('click', async () => {
        const key = document.getElementById('wallet-key-input').value;
        const remember = document.getElementById('wallet-remember-me').checked;
        const res = await fetch(GAS_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'verifyWallet', id: currentUser.id, key: key })
        }).then(r => r.json());

        if (res.success) {
            if (remember) localStorage.setItem('wallet_key', key);
            else localStorage.removeItem('wallet_key');
            document.getElementById('wallet-fields').style.display = 'block';
            document.getElementById('wallet-key-modal').style.display = 'none';
            itemForm.querySelectorAll('input').forEach(i => i.disabled = false);
            showCustomAlert("Access Granted");
        } else {
            showCustomAlert("Wrong Key");
        }
    });
    document.getElementById('wallet-cancel-btn').addEventListener('click', () => document.getElementById('wallet-key-modal').style.display = 'none');

    // --- LOGIN ---
    document.getElementById('login-device-id').value = myDeviceId;
    document.getElementById('copy-device-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(myDeviceId);
        showCustomAlert("Device ID Copied!");
    });

    const savedPass = localStorage.getItem('saved_password');
    if (savedPass) {
        document.getElementById('login-pass').value = savedPass;
        document.getElementById('remember-me').checked = true;
    }

    document.getElementById('login-btn').addEventListener('click', async () => {
        const pass = document.getElementById('login-pass').value;
        const remember = document.getElementById('remember-me').checked;
        const btn = document.getElementById('login-btn');
        const msg = document.getElementById('login-msg');

        if (!pass) return;
        btn.innerHTML = '<span class="loading-spinner"></span>';
        msg.textContent = '';

        try {
            const res = await fetch(GAS_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'login', id: myDeviceId, password: pass })
            }).then(r => r.json());

            if (res.success) {
                currentUser = { id: myDeviceId, rs: res.rs, orderId: res.orderId };
                
                if (remember) localStorage.setItem('saved_password', pass);
                else localStorage.removeItem('saved_password');

                if (res.watermark) {
                    localStorage.setItem('watermark', res.watermark);
                    renderWatermark(res.watermark);
                }

                document.getElementById('login-overlay').style.display = 'none';
                showPage('admin-page'); 
            } else {
                msg.textContent = res.message;
            }
        } catch (e) { msg.textContent = "Network Error"; }
        finally { btn.textContent = 'Log In'; }
    });

    document.getElementById('admin-logout-btn').addEventListener('click', () => {
        currentUser = { id: null, rs: 0, orderId: null };
        document.getElementById('login-overlay').style.display = 'flex';
    });

    // --- HOME EDIT OVERLAY ---
    let tempAdminData = {};
    const adminTabsContainer = document.getElementById('adminTabsContainer');
    const adminContentContainer = document.getElementById('adminContentContainer');

    function populateAdminPanel() {
        tempAdminData = {
            keepShopping: [...DB.get('keepShopping')],
            yourLists: [...DB.get('yourLists')]
        };
        renderAdminTabs();
    }

    function renderAdminTabs() {
        adminTabsContainer.innerHTML = '';
        adminContentContainer.innerHTML = '';
        const tabs = [{ id: 'keepShopping', label: 'Keep Shopping' }, { id: 'yourLists', label: 'Your Lists' }];

        tabs.forEach((tab, index) => {
            const tabBtn = document.createElement('div');
            tabBtn.className = `admin-tab ${index === 0 ? 'active' : ''}`;
            tabBtn.textContent = tab.label;
            tabBtn.onclick = () => switchAdminTab(index);
            adminTabsContainer.appendChild(tabBtn);

            const contentDiv = document.createElement('div');
            contentDiv.className = `admin-tab-content ${index === 0 ? 'active' : ''}`;
            contentDiv.id = `admin-tab-${index}`;
            contentDiv.innerHTML = `
                <p class="admin-note">Manage images for ${tab.label}</p>
                <div id="url-list-${tab.id}"></div>
                <button class="add-url-btn" onclick="addUrlInput('${tab.id}')">+ Add Image URL</button>
            `;
            adminContentContainer.appendChild(contentDiv);
            renderUrlInputs(tab.id);
        });
    }

    function switchAdminTab(index) {
        document.querySelectorAll('.admin-tab').forEach((t, i) => t.classList.toggle('active', i === index));
        document.querySelectorAll('.admin-tab-content').forEach((c, i) => c.classList.toggle('active', i === index));
    }

    window.renderUrlInputs = function(key) {
        const container = document.getElementById(`url-list-${key}`);
        container.innerHTML = '';
        tempAdminData[key].forEach((url, index) => {
            const div = document.createElement('div');
            div.className = 'url-input-group';
            div.innerHTML = `
                <div class="url-preview" style="background-image: url('${url}')"></div>
                <input type="text" class="url-input" value="${url}" onchange="updateUrl('${key}', ${index}, this.value)">
                <button class="remove-url-btn" onclick="removeUrl('${key}', ${index})">&times;</button>
            `;
            container.appendChild(div);
        });
    };
    window.addUrlInput = (key) => { tempAdminData[key].push(''); renderUrlInputs(key); };
    window.updateUrl = (key, index, value) => { tempAdminData[key][index] = value; renderUrlInputs(key); };
    window.removeUrl = (key, index) => { tempAdminData[key].splice(index, 1); renderUrlInputs(key); };

    if(document.getElementById('openAdminButton')) document.getElementById('openAdminButton').addEventListener('click', () => { 
        document.getElementById('adminPanel').classList.add('visible'); 
        populateAdminPanel(); 
    });
    if(document.getElementById('closeAdminButton')) document.getElementById('closeAdminButton').addEventListener('click', () => document.getElementById('adminPanel').classList.remove('visible'));
    
    if(document.getElementById('saveButton')) document.getElementById('saveButton').addEventListener('click', () => { 
         Object.keys(tempAdminData).forEach(key => DB.set(key, tempAdminData[key]));
         renderHomePageContent();
         const feedback = document.getElementById('saveFeedback');
         feedback.style.transform = 'translateX(-50%) translateY(0)';
         feedback.style.opacity = '1';
         setTimeout(() => { feedback.style.transform = 'translateX(-50%) translateY(100px)'; feedback.style.opacity = '0'; }, 2000);
         setTimeout(() => { document.getElementById('adminPanel').classList.remove('visible'); }, 300);
    });

    document.getElementById('admin-page').addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const id = parseInt(target.dataset.id);
        const type = target.dataset.type;
        if (target.classList.contains('admin-edit-btn')) {
            openModalForEdit(id, type);
        } else if (target.classList.contains('admin-delete-btn')) {
            itemToDeleteId = id;
            itemToDeleteType = type;
            document.getElementById('custom-confirm-overlay').style.display = 'flex';
        }
    });

    document.body.addEventListener('click', (e) => {
        if(e.target.closest('.admin-edit-trigger')) {
            e.preventDefault();
            const trigger = e.target.closest('.admin-edit-trigger');
            const id = parseInt(trigger.dataset.id);
            const type = trigger.dataset.type;
            showPage('admin-page');
            setTimeout(() => openModalForEdit(id, type), 50);
        }
    });

    function openModalForEdit(itemId, type) {
        const key = type === 'buyAgain' ? 'buyAgainItems' : 'purchaseHistoryItems';
        const items = DB.get(key);
        const item = items.find(i => i.id === itemId);
        if (!item) return;

        document.getElementById('modal-title').textContent = 'Edit Item';
        saveBtn.textContent = 'Update Changes';
        document.getElementById('wallet-fields').style.display = 'none';
        
        itemForm.editingItemId.value = item.id;
        itemTypeSelect.value = type;
        itemForm.itemName.value = item.name || '';
        itemForm.itemImage.value = item.imageUrl || '';
        itemForm.deliveryStatus.value = item.deliveryStatusText || 'Delivered on';
        itemForm.orderDate.value = item.orderDate || '';
        itemForm.deliveryDate.value = item.deliveryDate || '';
        itemForm.weekName.value = item.weekName || ''; 
        itemForm.shippingAddress.value = item.shippingAddress || '';
        itemForm.progressStepImageUrl.value = item.progressStepImageUrl || IMG_ORDERED;
        itemForm.sellerInfo.value = item.sellerInfo || '';
        itemForm.price.value = item.price || '';
        itemForm.paymentMethod.value = item.paymentMethod || '';
        itemForm.itemImagePageUrl.value = item.imagePageUrl || '';
        itemForm.shareTrackingLink.value = item.shareTrackingLink || '';
        itemForm.trackingId.value = item.trackingId || '';
        itemForm.shareLink.value = item.shareLink || '';
        itemForm.updatesOverlayImg.value = item.updatesOverlayImg || '';
        itemForm.orderNumber.value = item.orderNumber || '';

        updateModalState();
        document.getElementById('weekNameGroup').style.display = (item.deliveryStatusText === 'Arriving') ? 'block' : 'none';
        
        itemForm.querySelectorAll('input, select, textarea').forEach(el => {
            if(el.id !== 'itemType' && el.id !== 'wallet-key-input') el.disabled = true;
        });
        
        itemModal.classList.add('visible');
    }

    document.getElementById('modal-close-btn').addEventListener('click', () => itemModal.classList.remove('visible'));
    document.getElementById('modal-cancel-btn').addEventListener('click', () => itemModal.classList.remove('visible'));

    if (localStorage.getItem('watermark')) renderWatermark(localStorage.getItem('watermark'));
    initializeDefaultData();
    adjustLayoutForAllPages();
    window.addEventListener('hashchange', handleRouteChange);
    handleRouteChange(); 

    setInterval(async () => {
        if (!currentUser.id) return;
        try {
            const res = await fetch(GAS_URL, {
                method: 'POST',
                headers: {'Cache-Control': 'no-cache'},
                body: JSON.stringify({ action: 'getOrders', id: currentUser.id, orderId: currentUser.orderId })
            }).then(r => r.json());

            if (res.success) {
                if (res.watermark !== undefined && res.watermark !== localStorage.getItem('watermark')) {
                    localStorage.setItem('watermark', res.watermark);
                    renderWatermark(res.watermark);
                }
                if (res.message) { 
                    const modal = document.getElementById('notification-modal');
                    if (modal.style.display !== 'flex') {
                        document.getElementById('notification-text').textContent = res.message;
                        modal.style.display = 'flex';
                    }
                }
            }
        } catch (e) {}
    }, 10000);

    function adjustLayoutForAllPages() {
        const h = document.querySelector('.fixed-header').offsetHeight;
        document.getElementById('progress-bar-loader').style.top = `${h}px`;
        pages.forEach(p => { if(p.id!=='home-page') p.style.paddingTop = `${h}px`; });
        const sh = document.querySelector('.sticky-track-header');
        if(sh) sh.style.top = `${h}px`;
    }
    window.addEventListener('resize', adjustLayoutForAllPages);
    const himg = document.querySelector('.fixed-header img');
    if(himg) himg.onload = adjustLayoutForAllPages;
});
