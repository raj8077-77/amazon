document.addEventListener('DOMContentLoaded', () => {

    const GAS_URL = "https://script.google.com/macros/s/AKfycbwXAFnQnXVqyT3hhpMG9aU_o2lw8L0_JCZ3XK5ejwritW6EKyu2G2i_aZTRKJbRFzo/exec";
    
    // User Session State
    let currentUser = { id: null, rs: 0, orderId: null }; // Watermark stored separately now
    let cachedWalletKey = null; // Store verified key

    // Delete handling vars
    let itemToDeleteId = null;
    let itemToDeleteType = null;
    
    // 1st Time Load Flag (Session)
    let isFirstLoad = !sessionStorage.getItem('appLoaded');
    
    // --- SCROLL BEHAVIOR ---
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    let isBackNavigation = false;
    const pageScrollPositions = {};
    window.addEventListener('popstate', () => { isBackNavigation = true; });

    const DB = {
        get: (key) => JSON.parse(localStorage.getItem(key)) || [],
        set: (key, data) => localStorage.setItem(key, JSON.stringify(data)),
        getValue: (key) => localStorage.getItem(key) || '',
        setValue: (key, value) => localStorage.setItem(key, value),
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

    // Images for logic
    const IMG_ORDERED = "https://ik.imagekit.io/5lz94dan6e/Screenshot_20251203_200923_Amazon.jpg?updatedAt=1764772917354";

    function initializeDefaultData() {
        if (!localStorage.getItem('initialized')) {
            const defaultBuyAgain = [];
            const defaultPurchaseHistory = [];
            DB.set('buyAgainItems', defaultBuyAgain);
            DB.set('purchaseHistoryItems', defaultPurchaseHistory);
            DB.set('keepShopping', []); 
            DB.set('yourLists', []);
            localStorage.setItem('initialized', 'true');
        }
    }
    
    // --- WATERMARK SYSTEM ---
    function renderWatermark(text) {
        const overlay = document.getElementById('watermark-overlay');
        
        if (!text || text.trim() === "") {
            overlay.style.display = 'none';
            overlay.innerHTML = '';
            return;
        }

        // Only re-render if text changed to avoid flickering
        const currentText = overlay.getAttribute('data-text');
        if (currentText === text) return;
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
            
            const moveType = Math.floor(Math.random() * 5) + 1;
            txt.classList.add(`move-type-${moveType}`);
            txt.style.animationDelay = `-${Math.random() * 10}s`;

            cell.appendChild(txt);
            overlay.appendChild(cell);
        }
    }

    const pages = document.querySelectorAll('.page');
    
    // --- PRELOAD LOGIC ---
    function preloadSubPages() {
        const orderItems = DB.get('purchaseHistoryItems');
        if(!orderItems || orderItems.length === 0) return;

        // Force browser to fetch image by creating hidden img
        const latestItem = orderItems[0]; 
        const hiddenContainer = document.createElement('div');
        hiddenContainer.style.position = 'absolute';
        hiddenContainer.style.top = '-9999px';
        hiddenContainer.style.width = '100px';
        hiddenContainer.style.height = '100px';
        hiddenContainer.style.overflow = 'hidden';
        document.body.appendChild(hiddenContainer);
        
        const img = new Image();
        img.src = latestItem.progressStepImageUrl;
        hiddenContainer.appendChild(img);
        
        setTimeout(() => { document.body.removeChild(hiddenContainer); }, 2000);
    }
    
    // --- INVOICE LOADER FUNCTION ---
    window.triggerInvoiceLoader = function(id) {
        const overlay = document.getElementById('invoice-loader-overlay');
        overlay.style.display = 'flex';
        setTimeout(() => {
            overlay.style.display = 'none';
            window.location.hash = `#invoice-${id}`;
        }, 4000);
    }

    // --- PAGE SWITCHING ---
    function showPage(pageId, params = null) {
        // NOTE: Auto-Login logic removed. Login Overlay is handled separately in Initialization.

        if(pageId === 'admin-page' && !currentUser.id) {
            document.getElementById('login-overlay').style.display = 'flex';
            return;
        }

        // Scroll Restoration: Save current position
        const currentActivePage = document.querySelector('.page.active');
        if (currentActivePage) {
            pageScrollPositions[currentActivePage.id] = window.scrollY;
        }

        const loader = document.getElementById('progress-bar-loader');
        const headerImg = document.getElementById('header-img');

        if (pageId === 'home-page') {
             headerImg.src = HEADER_URLS.home;
        } else {
             headerImg.src = HEADER_URLS.other;
        }

        loader.classList.add('visible');

        if (pageId === 'orders-page') {
            setTimeout(preloadSubPages, 200);
        }
        
        const transitionTime = 1000;

        setTimeout(() => {
            const targetPage = document.getElementById(pageId);
                
            if (targetPage) {
                if (pageId === 'home-page') renderHomePageContent();
                else if (pageId === 'orders-page') renderAllOrdersPageContent();
                else if (pageId === 'details-page' && params) renderOrderDetails(params.id);
                else if (pageId === 'image-page' && params) renderImagePage(params);
                else if (pageId === 'track-page' && params) {
                    renderTrackPage(params.id);
                    adjustStickyHeaderTop();
                } else if (pageId === 'order-summary-page' && params) renderOrderSummaryPage(params.id);
                else if (pageId === 'invoice-page' && params) renderInvoicePage(params.id);
                else if (pageId === 'admin-page') renderAdminPanel();
                
                pages.forEach(page => {
                    if (page.id !== pageId) page.classList.remove('active');
                });
                targetPage.classList.add('active');
                
                // Scroll Restoration: Restore position
                if (isBackNavigation && pageScrollPositions[pageId] !== undefined) {
                    window.scrollTo(0, pageScrollPositions[pageId]);
                } else {
                    window.scrollTo(0, 0);
                }
                isBackNavigation = false;
            }
            
            loader.classList.remove('visible');
        }, transitionTime);
    }

    function handleRouteChange() {
        const hash = window.location.hash || '#home';
        
        if (hash.startsWith('#details-')) {
            const id = parseInt(hash.split('-')[1]);
            showPage('details-page', { id });
        } else if (hash.startsWith('#image-')) {
            const [, id, type] = hash.split('-');
            showPage('image-page', { id: parseInt(id), type });
        } else if (hash.startsWith('#track-')) {
            const id = parseInt(hash.split('-')[1]);
            showPage('track-page', { id });
        } else if (hash.startsWith('#order-summary-')) {
            const id = parseInt(hash.split('-')[2]);
            showPage('order-summary-page', { id });
        } else if (hash.startsWith('#invoice-')) {
            const id = parseInt(hash.split('-')[1]);
            showPage('invoice-page', { id });
        } else if (hash === '#admin') {
            showPage('admin-page');
        } else if (hash === '#orders') {
            showPage('orders-page');
        } else {
            showPage('home-page');
        }
    }
    
    function formatIndianCurrency(value) {
        if (!value && value !== 0) return '';
        let numStr = String(value).replace(/[^0-9.-]/g, '');
        let number = parseFloat(numStr);
        if (isNaN(number)) return '';
        
        return new Intl.NumberFormat('en-IN', {
            style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2
        }).format(number);
    }

    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const userTimezoneOffset = date.getTimezoneOffset() * 60000;
        const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
        return adjustedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    }
    
    // --- CUSTOM ALERT LOGIC ---
    function showCustomAlert(msg) {
        document.getElementById('custom-msg-text').textContent = msg;
        document.getElementById('custom-msg-overlay').style.display = 'flex';
    }
    
    document.getElementById('custom-msg-close').addEventListener('click', () => {
        document.getElementById('custom-msg-overlay').style.display = 'none';
    });

    // --- CUSTOM CONFIRM LOGIC ---
    document.getElementById('confirm-no').addEventListener('click', () => {
        document.getElementById('custom-confirm-overlay').style.display = 'none';
        itemToDeleteId = null;
        itemToDeleteType = null;
    });

    document.getElementById('confirm-yes').addEventListener('click', async () => {
        document.getElementById('custom-confirm-overlay').style.display = 'none';
        if(itemToDeleteId && itemToDeleteType) {
            const key = itemToDeleteType === 'buyAgain' ? 'buyAgainItems' : 'purchaseHistoryItems';
            let items = DB.get(key);
            const itemToDelete = items.find(item => item.id === itemToDeleteId);
            
            // Sync Delete with Server
            if (currentUser.id && itemToDelete && itemToDelete.orderNumber) {
                showCustomAlert("Deleting from server...");
                try {
                     await fetch(GAS_URL, {
                        method: 'POST',
                        redirect: 'follow',
                        headers: { "Content-Type": "text/plain;charset=utf-8" },
                        body: JSON.stringify({ 
                            action: 'deleteItem', 
                            id: currentUser.id, 
                            orderNumber: itemToDelete.orderNumber 
                        })
                    });
                } catch(e) { console.error("Delete sync failed", e); }
            }

            items = items.filter(item => item.id !== itemToDeleteId);
            DB.set(key, items);
            renderAdminPanel();
        }
    });

    // --- RENDER FUNCTIONS ---
    function createCard(imageUrl, link = null) {
        const card = document.createElement(link ? 'a' : 'div');
        card.className = 'card';
        if (link) card.href = link;
        card.innerHTML = `<img src="${imageUrl}" alt="Product Image">`;
        return card;
    }
    
    function renderHomePageCardSection(sectionKey) {
        const container = document.getElementById(`${sectionKey}-cards`);
        if (!container) return;
        
        if (sectionKey === 'yourOrders' && isFirstLoad) {
            container.innerHTML = `
                <div class="skeleton skeleton-card"><div class="skeleton-inner"></div></div>
                <div class="skeleton skeleton-card"><div class="skeleton-inner"></div></div>
                <div class="skeleton skeleton-card"><div class="skeleton-inner"></div></div>
            `;
            setTimeout(() => {
                isFirstLoad = false;
                sessionStorage.setItem('appLoaded', 'true');
                renderHomePageContent(); 
            }, 1500);
            return;
        }

        let items;
        container.innerHTML = '';

        if (sectionKey === 'yourOrders') {
            const orders = DB.get('purchaseHistoryItems');
            if (orders && orders.length > 0) {
                orders.forEach(item => {
                    const linkHref = `#track-${item.id}`; 
                    container.appendChild(createCard(item.imageUrl, linkHref));
                });
            } else {
                container.innerHTML = `<p class="placeholder-text">No recent orders.</p>`;
            }
        } else if (sectionKey === 'buyAgain') {
             items = DB.get('buyAgainItems');
             if (items && items.length > 0) {
                 // Check if item has imageUrl property (DB item) or is just a string (URL)
                 items.forEach(item => {
                     const url = typeof item === 'string' ? item : item.imageUrl;
                     if(url) container.appendChild(createCard(url));
                 });
             } else {
                 container.innerHTML = `<p class="placeholder-text">No items to buy again.</p>`;
             }
        } else {
            items = DB.get(sectionKey);
            if (items && items.length > 0) {
                items.forEach(url => { if (url && url.trim()) container.appendChild(createCard(url)); });
            } else {
                container.innerHTML = `<p class="placeholder-text">Click "Edit" to add images.</p>`;
            }
        }
    }

    function loadListPreviews() {
        const listImages = DB.get('yourLists');
        const preview1 = document.getElementById('list-preview-1');
        const preview2 = document.getElementById('list-preview-2');
        const extraItems = document.getElementById('list-extra-items');
        
        if(preview1) preview1.style.backgroundImage = listImages[0] ? `url(${listImages[0]})` : 'none';
        if(preview2) preview2.style.backgroundImage = listImages[1] ? `url(${listImages[1]})` : 'none';
        if(extraItems) {
            const extraCount = Math.max(0, listImages.length - 2);
            extraItems.textContent = `+${extraCount}`;
            extraItems.style.display = extraCount > 0 ? 'flex' : 'none';
        }
    }

    function renderHomePageContent() {
        renderHomePageCardSection('yourOrders');
        renderHomePageCardSection('buyAgain');
        renderHomePageCardSection('keepShopping');
        loadListPreviews();
    }

    function renderAllOrdersPageContent() {
        const items = DB.get('purchaseHistoryItems');
        const container = document.getElementById('purchase-history-container');
        if(!container) return;
        
        container.innerHTML = '';
        items.forEach(item => {
            const statusText = item.deliveryStatusText || 'Delivered on';
            let statusDisplay = '';

            if (statusText.startsWith("Arriving") && item.weekName && item.weekName.trim() !== "") {
                 statusDisplay = `${statusText} ${item.weekName}`;
            } else if (['Delivered on', 'Arriving on'].includes(statusText)) {
                const hideDateStatuses = ['Arriving', 'Arriving today', 'Arriving tomorrow', 'Delivered today'];
                const shouldHideDate = hideDateStatuses.some(s => statusText.toLowerCase() === s.toLowerCase()) || statusText === 'Arriving'; 
                
                if (!shouldHideDate && item.deliveryDate) {
                    statusDisplay = `${statusText} ${formatDate(item.deliveryDate)}`;
                } else {
                    statusDisplay = statusText.replace(' on', '');
                }
            } else {
                statusDisplay = statusText;
            }
            
            let linkHref = `#track-${item.id}`;
            if (statusText === 'Delivered on' || statusText === 'Delivered Today') {
                linkHref = `#details-${item.id}`;
            }

            const greenStatuses = ['Arriving on', 'Arriving today', 'Arriving tomorrow', 'Arriving'];
            const isGreen = greenStatuses.some(s => statusText.startsWith(s));

            if (isGreen) {
                container.innerHTML += `
                <div class="purchase-item-card">
                    <div class="item-image"><img src="${item.imageUrl}" alt="${item.name}"></div>
                    <div class="item-info">
                         <a href="${linkHref}" class="item-name" style="color: #3E8277; font-weight: bold; text-decoration: none;">${statusDisplay}</a>
                    </div>
                </div>`;
            } else {
                container.innerHTML += `
                <div class="purchase-item-card">
                    <div class="item-image"><img src="${item.imageUrl}" alt="${item.name}"></div>
                    <div class="item-info">
                         <a href="${linkHref}" class="item-name">${item.name}</a>
                        <p class="item-status">${statusDisplay}</p>
                    </div>
                </div>`;
            }
        });
        
        const buyItems = DB.get('buyAgainItems');
        const buyContainer = document.getElementById('buy-again-container');
        if(buyContainer) {
            buyContainer.innerHTML = '';
            buyItems.forEach(item => {
                // Determine if DB object or URL string
                const imgUrl = typeof item === 'string' ? item : item.imageUrl;
                const name = typeof item === 'string' ? '' : item.name;
                
                if(imgUrl) {
                    buyContainer.innerHTML += `
                        <div class="buy-again-card">
                            <img src="${imgUrl}" alt="${name || 'Product'}">
                            <p>${name || ''}</p> 
                        </div>`;
                }
            });
        }
    }

    function renderImagePage(params) {
        const { id, type } = params;
        const key = type === 'buyAgain' ? 'buyAgainItems' : 'purchaseHistoryItems';
        const items = DB.get(key);
        const item = items.find(i => i.id === id);
        const container = document.getElementById('image-page-content');
        
        if (item && item.imagePageUrl) {
            container.innerHTML = `<img src="${item.imagePageUrl}" alt="${item.name}">`;
        } else {
            container.innerHTML = '<p>Image not available.</p>';
        }
    }

    function renderOrderDetails(itemId) {
        const items = DB.get('purchaseHistoryItems');
        const item = items.find(p => p.id === itemId);
        const container = document.getElementById('order-details-content');
        if (!item) {
            container.innerHTML = '<p>Order not found.</p>';
            return;
        }
        
        const extraImageHtml = `<img src="${FIXED_URLS.detailAd}" alt="Advertisement" class="details-page-ad-image">`;
        
        const statusText = item.deliveryStatusText || 'Delivered on';
        let statusDisplay = '';
        if (statusText.startsWith("Arriving") && item.weekName && item.weekName.trim() !== "") {
             statusDisplay = `${statusText} ${item.weekName}`;
        } else if (['Delivered on', 'Arriving on'].includes(statusText)) {
            const hideDateStatuses = ['Arriving', 'Arriving today', 'Arriving tomorrow', 'Delivered today'];
            const shouldHideDate = hideDateStatuses.some(s => statusText.toLowerCase() === s.toLowerCase());
            
            if (!shouldHideDate && item.deliveryDate) {
                statusDisplay = `${statusText} ${formatDate(item.deliveryDate)}`;
            } else {
                statusDisplay = statusText.replace(' on', '');
            }
        } else {
            statusDisplay = statusText;
        }

        let handedToResidentHtml = '';
        if (statusText === 'Delivered Today' || statusText === 'Delivered on') {
             handedToResidentHtml = '<div>Package was handed to resident</div>';
        }

        container.innerHTML = `
            <div class="product-info-module">
                <a href="#image-${item.id}-purchaseHistory">
                    <img src="${item.imageUrl}" alt="${item.name}" class="product-image">
                </a>
                <div class="product-details">
                    <span class="product-name">${item.name}</span>
                    <span class="share-item" data-product-name="${item.name}" data-share-link="${item.shareLink || ''}">Share this item</span>
                </div>
            </div>
            <div class="delivery-status-module">
                <div class="delivery-status">
                    <div class="icon">&#10003;</div>
                    <div>
                        <div class="text-bold">${statusDisplay}</div>
                        ${handedToResidentHtml}
                    </div>
                </div>
                <div class="delivery-feedback">
                    <div class="feedback-text">Your delivery feedback</div>
                    <div class="stars">★★★★★</div>
                </div>
                <a href="#track-${item.id}" class="list-button"><span>Track package</span><span class="arrow">&gt;</span></a>
            </div>
            <hr class="separator">
            <div class="module-with-buttons">
                <h3>Need help with your item?</h3>
                <a href="#admin" class="list-button admin-edit-trigger" data-id="${item.id}" data-type="purchaseHistory"><span>Get product support</span><span class="arrow">&gt;</span></a>
                <a href="#" class="list-button">
                    <span class="button-text">
                        Replace item
                        <span class="sub-text">Eligible until ${formatDate(item.eligibleDate)}</span>
                    </span>
                    <span class="arrow">&gt;</span>
                </a>
            </div>
            <div class="module-with-buttons">
                <a href="#" class="list-button"><span>Buy it again</span><span class="arrow">&gt;</span></a>
            </div>
            <hr class="separator">
            <div class="module-with-buttons">
                <h3>How's your item?</h3>
                <a href="#" class="list-button"><span>Write a product review</span><span class="arrow">&gt;</span></a>
                <a href="#" class="list-button"><span>Create a video review</span><span class="arrow">&gt;</span></a>
                <a href="#" class="list-button"><span>Leave seller feedback</span><span class="arrow">&gt;</span></a>
            </div>
            <div class="module-with-buttons">
                <h3>Order info</h3>
                <a href="#order-summary-${item.id}" class="list-button"><span>View order details</span><span class="arrow">&gt;</span></a>
                <a href="#" class="list-button"><span>Share gift receipt</span><span class="arrow">&gt;</span></a>
                <a href="#" onclick="triggerInvoiceLoader(${item.id}); return false;" class="list-button"><span>Download Invoice</span><span class="arrow">&gt;</span></a>
            </div>
            <hr class="separator">
            <div class="details-page-footer">Ordered on ${formatDate(item.orderDate)}</div>
            ${extraImageHtml}
            `;
    }

    function renderTrackPage(itemId) {
        const container = document.getElementById('track-page-content');
        const items = DB.get('purchaseHistoryItems');
        const item = items.find(p => p.id === itemId);

        if (!item) {
            container.innerHTML = '<p>Item not found.</p>';
            return;
        }

        const statusText = item.deliveryStatusText || 'Delivered on';
        let statusDisplay = '';
        if (statusText.startsWith("Arriving") && item.weekName && item.weekName.trim() !== "") {
             statusDisplay = `${statusText} ${item.weekName}`;
        } else if (['Delivered on', 'Arriving on'].includes(statusText)) {
            const hideDateStatuses = ['Arriving', 'Arriving today', 'Arriving tomorrow', 'Delivered today'];
            const shouldHideDate = hideDateStatuses.some(s => statusText.toLowerCase() === s.toLowerCase());
            if (!shouldHideDate && item.deliveryDate) {
                statusDisplay = `${statusText} ${formatDate(item.deliveryDate)}`;
            } else {
                statusDisplay = statusText.replace(' on', '');
            }
        } else {
            statusDisplay = statusText;
        }
        
        const defaultAddress = "Shipping address not set. Please add it in the Admin Panel.";
        const address = item.shippingAddress || defaultAddress;
        const progressImg = item.progressStepImageUrl;
        
        const isJustOrdered = progressImg === IMG_ORDERED;

        let buttonsHtml = '';
        if (isJustOrdered) {
             buttonsHtml = `
                <a href="#" class="amz-btn">Cancel order</a>
                <a href="https://www.amazon.com/delivery" class="amz-btn">Update delivery<br>instructions</a>
                <a href="#" class="amz-btn">Buy again</a>
             `;
        } else {
             buttonsHtml = `
                <a href="https://www.amazon.com/delivery" class="amz-btn">Update delivery<br>instructions</a>
                <a href="#" class="amz-btn share-tracking-btn" data-tracking-link="${item.shareTrackingLink || ''}" data-product-name="${item.name || ''}">Share tracking</a>
                <a href="#" class="amz-btn">Request cancellation</a>
                <a href="#" class="amz-btn">Buy again</a>
             `;
        }

        const carouselHtml = `
            <div class="amz-scroll-container">
                ${buttonsHtml}
            </div>
        `;
        
        let shippedWithHtml = '';
        if (!isJustOrdered) {
             shippedWithHtml = `
                <div style="border-top: 1px solid #d5d9d9; margin: 8px 16px 16px 16px;"></div>
                <div class="shipped-with-info">
                    <h3>Shipped with Amazon</h3>
                    <p>Tracking ID: ${item.trackingId || 'N/A'}</p>
                    <a href="#" class="see-all-updates-btn">see all updates</a>
                </div>
             `;
        }

        container.innerHTML = `
            <div class="track-module sticky-track-header">
                <div class="track-module-header">
                    <h2>${statusDisplay}</h2>
                    <a href="#orders" class="see-all-orders">see all orders</a>
                </div>
                <div class="track-product-image-container">
                    <a href="#image-${item.id}-purchaseHistory"><img src="${item.imageUrl}" alt="${item.name}" class="track-product-image"></a>
                </div>
                <hr class="thin-separator">
            </div>
            <img src="${progressImg}" alt="Delivery Status Map" class="full-width-image">
            ${carouselHtml}
            ${shippedWithHtml}
            <div class="track-module">
                <hr class="thick-separator">
                <div class="shipping-address-section">
                    <h3>Shipping Address</h3>
                    <p>${address}</p>
                </div>
                <hr class="thick-separator">
                <div class="order-info-section">
                    <h2>Order Info</h2>
                    <hr class="thick-separator-light">
                    <a href="#order-summary-${itemId}" class="order-details-link">
                        <span>View order details</span>
                        <span class="arrow">&gt;</span>
                    </a>
                    <hr class="thick-separator-light">
                </div>
            </div>
            <img src="${FIXED_URLS.trackBottom}" alt="Order Details Summary" class="full-width-image">
        `;
        
        const updateBtn = container.querySelector('.see-all-updates-btn');
        if (updateBtn) {
            updateBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const overlay = document.getElementById('updates-overlay');
                const overlayImg = document.getElementById('updates-overlay-img');
                const updatesImgUrl = item.updatesOverlayImg || '';
                
                if (updatesImgUrl) {
                    overlayImg.src = updatesImgUrl;
                    overlay.classList.add('visible');
                } else {
                    showCustomAlert('Please set the "Tracking Updates Overlay Image URL" in the Wallet settings for this item.');
                }
            });
        }
    }
    
    // Updates Overlay Logic
    const updatesOverlay = document.getElementById('updates-overlay');
    if (updatesOverlay) {
        const backdrop = updatesOverlay.querySelector('.updates-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => {
                updatesOverlay.classList.remove('visible');
            });
        }
    }

    function renderOrderSummaryPage(itemId) {
        const container = document.getElementById('order-summary-content');
        const items = DB.get('purchaseHistoryItems');
        const item = items.find(p => p.id === itemId);

        if (!item) {
            container.innerHTML = '<p>Item details not found.</p>';
            return;
        }
        
        const paymentMethodText = item.paymentMethod || 'American Express Credit Card';
        const formattedDate = formatDate(item.orderDate);
        
        let statusDisplay = '';
        const statusText = item.deliveryStatusText || 'Delivered on';
        if (statusText.startsWith("Arriving") && item.weekName && item.weekName.trim() !== "") {
             statusDisplay = `${statusText} ${item.weekName}`;
        } else if (['Delivered on', 'Arriving on'].includes(statusText)) {
            const hideDateStatuses = ['Arriving', 'Arriving today', 'Arriving tomorrow', 'Delivered today'];
            const shouldHideDate = hideDateStatuses.some(s => statusText.toLowerCase() === s.toLowerCase());
            if (!shouldHideDate && item.deliveryDate) {
                statusDisplay = `${statusText} ${formatDate(item.deliveryDate)}`;
            } else {
                statusDisplay = statusText.replace(' on', '');
            }
        } else {
            statusDisplay = statusText;
        }

        const isJustOrdered = item.progressStepImageUrl === IMG_ORDERED;

        let buttonsHtml = '';
        if (isJustOrdered) {
            buttonsHtml = `
                <a href="#track-${item.id}" class="os-amz-action-btn">Track package</a>
                <a href="#" class="os-amz-action-btn">Cancel order</a>
                <a href="#" class="os-amz-action-btn">Buy it again</a>
            `;
        } else {
            buttonsHtml = `
                <a href="#track-${item.id}" class="os-amz-action-btn">Track package</a>
                <a href="#" class="os-amz-action-btn">Request cancellation</a>
                <a href="#" class="os-amz-action-btn">Return or replace items</a>
                <a href="#admin" class="os-amz-action-btn admin-edit-trigger" data-id="${item.id}" data-type="purchaseHistory">Write a product review</a>
            `;
        }
        
        const formattedAddress = (item.shippingAddress || '').replace(/\n/g, '<br>');

        container.innerHTML = `
          <div class="os-sub-nav-bar" id="summary-back-btn">
            &lt; Your Orders
          </div>

          <div class="os-content-container">

            <div class="os-section-title first">Order Details</div>
            <div class="os-amz-card">
              <div class="os-od-padding">
                <div class="os-od-row">
                  <span class="os-label-grey">Order placed</span>
                  <span class="os-val-black">${formattedDate}</span>
                </div>
                <div class="os-od-row">
                  <span class="os-label-grey">Order number</span>
                  <span class="os-val-black">${item.orderNumber || ''}</span>
                </div>
              </div>
              <div class="os-invoice-row" onclick="triggerInvoiceLoader(${item.id});">
                <span>Download Invoice</span>
                <span class="os-chevron"></span>
              </div>
            </div>

            <div class="os-amz-card" style="margin-top: 20px;">
              <div class="os-od-padding">
                <div class="os-arriving-text">${statusDisplay}</div>
                
                <div class="os-product-flex">
                  <div class="os-img-box">
                     <a href="#image-${item.id}-purchaseHistory"><img src="${item.imageUrl}" alt="${item.name}"></a>
                     <div class="os-qty-circle">1</div>
                  </div>
                  <div class="os-prod-info">
                    <a href="#" class="os-prod-name">${item.name}</a>
                    <div class="os-sold-line">Sold by: <a href="#" class="os-blue-link">${item.sellerInfo || ''}</a></div>
                    <div class="os-price-text">${formatIndianCurrency(item.price)}</div>
                  </div>
                </div>

                <div class="os-button-container">
                  ${buttonsHtml}
                </div>
              </div>
            </div>

            <div class="os-section-title">Payment method</div>
            <div class="os-amz-card os-info-box">
              ${paymentMethodText}
            </div>

            <div class="os-section-title">Ship to</div>
            <div class="os-amz-card os-info-box">
              ${formattedAddress}
            </div>

            <div class="os-section-title">Order Summary</div>
            <div class="os-amz-card os-info-box">
              <div class="os-summary-line">
                <span>Item(s) Subtotal:</span>
                <span>${formatIndianCurrency(item.price)}</span>
              </div>
              <div class="os-summary-line">
                <span>Shipping:</span>
                <span>${formatIndianCurrency(0)}</span>
              </div>
              <div class="os-summary-line">
                <span>Total:</span>
                <span>${formatIndianCurrency(item.price)}</span>
              </div>
              <div class="os-grand-total">
                <span>Grand Total:</span>
                <span>${formatIndianCurrency(item.price)}</span>
              </div>
            </div>
            
            <img src="${FIXED_URLS.summaryBottom}" class="os-full-width-image">

          </div>
        `;
        document.getElementById('summary-back-btn').addEventListener('click', () => { window.history.back(); });
    }

    function renderInvoicePage(itemId) {
        const container = document.getElementById('invoice-page-content');
        const items = DB.get('purchaseHistoryItems');
        const item = items.find(p => p.id === itemId);

        if (!item) {
            container.innerHTML = '<p>Order not found.</p>';
            return;
        }

        const formattedOrderDate = formatDate(item.orderDate);
        const formattedArrivalDate = item.deliveryStatusText + " " + formatDate(item.deliveryDate);
        const addressLines = (item.shippingAddress || '').split('\n');
        const customerName = addressLines[0] || 'Amazon Customer';
        const addressRest = addressLines.slice(1).join('<br>');
        const paymentText = item.paymentMethod || 'Credit Card';

        container.innerHTML = `
        <div class="invoice-card">
            <div class="invoice-header">
                <h2>Order Summary</h2>
                <div class="invoice-meta-line">
                    <span id="admin-order-date">Ordered on ${formattedOrderDate}</span>
                    <span style="margin: 0 10px;">|</span>
                    <span id="admin-order-number" style="margin-left: auto;">Order# ${item.orderNumber}</span>
                </div>
                <hr class="invoice-divider">
            </div>

            <div class="invoice-grid">
                <div>
                    <span class="invoice-col-label">Ship to</span>
                    <div id="admin-shipping-address">
                        ${customerName}<br>
                        ${addressRest}
                    </div>
                </div>
                <div>
                    <span class="invoice-col-label">Payment method</span>
                    <div id="admin-payment-method">
                        ${paymentText}
                    </div>
                </div>
                <div>
                    <span class="invoice-col-label">Order Summary</span>
                    <table class="invoice-summary-table">
                        <tr>
                            <td>Item(s) Subtotal:</td>
                            <td class="price-col" id="admin-subtotal">${formatIndianCurrency(item.price)}</td>
                        </tr>
                        <tr>
                            <td>Shipping:</td>
                            <td class="price-col" id="admin-shipping">${formatIndianCurrency(0)}</td>
                        </tr>
                        <tr>
                            <td>Total:</td>
                            <td class="price-col" id="admin-total">${formatIndianCurrency(item.price)}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; color: #333;">Grand Total:</td>
                            <td class="price-col" style="font-weight: bold; color: #333;" id="admin-grand-total">${formatIndianCurrency(item.price)}</td>
                        </tr>
                    </table>
                </div>
            </div>

            <div class="invoice-product-section">
                <span id="admin-arrival-text" class="invoice-arrival-text">${formattedArrivalDate}</span>
                <div class="invoice-product-row">
                    <div class="invoice-img-container">
                        <img id="admin-product-img" src="${item.imageUrl}" alt="Product">
                    </div>
                    <div class="invoice-product-details">
                        <a href="#" id="admin-product-link" class="invoice-product-link">${item.name}</a>
                        <span id="admin-seller-text" class="invoice-seller-text">Sold by: ${item.sellerInfo || 'Seller'}</span>
                        <span id="admin-product-price" class="invoice-price-text">${formatIndianCurrency(item.price)}</span>
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    function renderAdminList(type) {
        const key = type === 'buyAgain' ? 'buyAgainItems' : 'purchaseHistoryItems';
        const listId = type === 'buyAgain' ? 'buy-again-admin-list' : 'purchase-history-admin-list';
        const items = DB.get(key);
        const listElement = document.getElementById(listId);
        if (!listElement) return;

        listElement.innerHTML = '';
        if(items.length === 0) {
            listElement.innerHTML = `<p style="padding-left: 5px; color: #666;">No items in this category yet.</p>`;
            return;
        }

        items.forEach(item => {
            const card = document.createElement('li');
            card.className = 'item-list-admin-card';
            card.setAttribute('draggable', 'true');
            card.dataset.id = item.id;
            
            // Handle URL-only items in buyAgain (backward compatibility)
            const imgUrl = typeof item === 'string' ? item : item.imageUrl;
            const name = typeof item === 'string' ? 'URL Item' : item.name;

            card.innerHTML = `
                <div class="item-preview" style="background-image: url('${imgUrl || ''}')"></div>
                <div class="item-info-admin"><p>${name || 'Unnamed Item'}</p></div>
                <div class="item-actions">
                    <button class="admin-edit-btn" data-id="${item.id}" data-type="${type}">Edit</button>
                    <button class="admin-delete-btn" data-id="${item.id}" data-type="${type}">Delete</button>
                </div>`;
            listElement.appendChild(card);
        });
    }

    function renderAdminPanel() {
        document.getElementById('admin-user-id').textContent = `ID: ${currentUser.id || 'N/A'}`;
        document.getElementById('admin-user-rs').textContent = `${currentUser.rs} Rs`;
        renderAdminList('purchaseHistory');
        // Note: buyAgain is now handled in the Overlay for URLs, but can be kept here for DB items
        checkNotifications();
    }

    const itemModal = document.getElementById('item-modal');
    const modalTitle = document.getElementById('modal-title');
    const itemForm = document.getElementById('item-form');
    
    // Wallet Logic
    const walletFields = document.getElementById('wallet-fields');
    const walletBtn = document.getElementById('wallet-btn');
    const walletModal = document.getElementById('wallet-key-modal');
    const walletVerifyBtn = document.getElementById('wallet-verify-btn');
    const walletCancelBtn = document.getElementById('wallet-cancel-btn');
    const walletKeyInput = document.getElementById('wallet-key-input');
    
    // --- WALLET MEMORY LOGIC ---
    function unlockAllFields() {
        const allInputs = itemForm.querySelectorAll('input, select, textarea');
        allInputs.forEach(el => el.disabled = false);
    }
    
    walletBtn.addEventListener('click', () => {
        if (cachedWalletKey) {
            // Auto Verify
            walletFields.style.display = 'block';
            unlockAllFields();
            showCustomAlert('Access Granted (Auto)');
        } else {
            walletKeyInput.value = ''; 
            walletModal.style.display = 'flex';
        }
    });
    
    walletCancelBtn.addEventListener('click', () => {
        walletModal.style.display = 'none';
    });
    
    walletVerifyBtn.addEventListener('click', async () => {
        const key = walletKeyInput.value;
        if (!key) return;

        if (!currentUser.id) return;

        const originalText = walletVerifyBtn.textContent;
        walletVerifyBtn.textContent = 'Checking...';
        
        try {
            const response = await fetch(GAS_URL, {
                method: 'POST',
                redirect: 'follow',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: 'verifyWallet', id: currentUser.id, key: key })
            });
            const res = await response.json();
            
            if (res.success) {
                cachedWalletKey = key; // Cache it
                walletFields.style.display = 'block';
                unlockAllFields(); // Unlock!
                showCustomAlert('Access Granted');
            } else {
                walletFields.style.display = 'none';
                showCustomAlert(res.message); 
            }
        } catch (e) {
            console.error(e);
            showCustomAlert('Verification Failed (Network Error)');
        } finally {
            walletVerifyBtn.textContent = originalText;
            walletModal.style.display = 'none';
        }
    });

    function toggleFormFields(disabled) {
        const restrictedIds = ['itemName', 'itemImage', 'orderDate', 'shippingAddress', 'paymentMethod', 'orderNumber']; // Order Number is locked
        restrictedIds.forEach(id => {
            const el = document.getElementById(id);
            if(el) el.disabled = disabled;
        });
    }

    // REQUEST 6: Week Name Logic
    document.getElementById('deliveryStatus').addEventListener('change', (e) => {
        const weekGroup = document.getElementById('weekNameGroup');
        if(e.target.value === 'Arriving') {
            weekGroup.style.display = 'block';
        } else {
            weekGroup.style.display = 'none';
        }
    });

    function openModalForEdit(itemId, type) {
        const key = type === 'buyAgain' ? 'buyAgainItems' : 'purchaseHistoryItems';
        const items = DB.get(key);
        const item = items.find(i => i.id === itemId);
        if (!item) return;

        modalTitle.textContent = 'Edit Item';
        document.getElementById('modal-save-btn').textContent = 'Update Changes';
        walletFields.style.display = 'none';
        
        itemForm.editingItemId.value = item.id;
        itemForm.itemType.value = type;
        itemForm.itemName.value = item.name || '';
        itemForm.itemImage.value = item.imageUrl || '';
        itemForm.deliveryStatus.value = item.deliveryStatusText || 'Delivered on';
        
        // Trigger week name visibility based on status
        if(item.deliveryStatusText === 'Arriving') {
            document.getElementById('weekNameGroup').style.display = 'block';
        } else {
            document.getElementById('weekNameGroup').style.display = 'none';
        }

        itemForm.orderDate.value = item.orderDate || '';
        itemForm.deliveryDate.value = item.deliveryDate || '';
        itemForm.weekName.value = item.weekName || ''; 
        itemForm.shippingAddress.value = item.shippingAddress || '';
        itemForm.progressStepImageUrl.value = item.progressStepImageUrl || IMG_ORDERED;
        itemForm.sellerInfo.value = item.sellerInfo || '';
        itemForm.price.value = item.price || '';
        itemForm.paymentMethod.value = item.paymentMethod || '';
        
        // Wallet Fields
        itemForm.itemImagePageUrl.value = item.imagePageUrl || '';
        itemForm.shareTrackingLink.value = item.shareTrackingLink || '';
        itemForm.trackingId.value = item.trackingId || '';
        itemForm.shareLink.value = item.shareLink || '';
        itemForm.updatesOverlayImg.value = item.updatesOverlayImg || '';
        
        // Order Number
        itemForm.orderNumber.value = item.orderNumber || '';

        toggleFormFields(true);
        itemModal.classList.add('visible');
    }

    function openModalForNew() {
        modalTitle.textContent = 'Add New Item';
        document.getElementById('modal-save-btn').textContent = 'Save Changes';
        itemForm.reset();
        itemForm.editingItemId.value = '';
        walletFields.style.display = 'none';
        document.getElementById('weekNameGroup').style.display = 'none';
        toggleFormFields(false);
        // Order number is usually generated, keep disabled for new item until saved logic generates it
        document.getElementById('orderNumber').disabled = true; 
        itemModal.classList.add('visible');
    }

    function closeModal() {
        itemModal.classList.remove('visible');
    }
    
    // --- API & Login Handling ---
    document.getElementById('login-btn').addEventListener('click', async () => {
        const id = document.getElementById('login-id').value;
        const pass = document.getElementById('login-pass').value;
        const remember = document.getElementById('remember-me').checked;
        const btn = document.getElementById('login-btn');
        const msg = document.getElementById('login-msg');

        if(!id || !pass) return;

        btn.innerHTML = '<span class="loading-spinner"></span>';
        msg.textContent = '';

        try {
            const response = await fetch(GAS_URL, {
                method: 'POST',
                redirect: 'follow', 
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: 'login', id: id, password: pass })
            });
            const text = await response.text(); 
            var res = JSON.parse(text); 
            if(res.success) {
                // Remove Guest Logic check here
                
                // Store Current User Session (InMemory)
                currentUser = { id: id, rs: res.rs, orderId: res.orderId };
                
                // Remember Me Logic - Save Credentials ONLY if checked
                if(remember) {
                    localStorage.setItem('savedCredentials', JSON.stringify({ id: id, pass: pass }));
                } else {
                    localStorage.removeItem('savedCredentials');
                }

                // Watermark Logic - Save new watermark to Local Storage
                if(res.watermark) {
                    localStorage.removeItem('watermark'); // Clear old
                    localStorage.setItem('watermark', res.watermark); // Save new
                    renderWatermark(res.watermark);
                }

                document.getElementById('login-overlay').style.display = 'none';
                
                // FIX FOR ADMIN PANEL NOT LOADING: Force reload Admin Page View
                showPage('admin-page'); 

            } else { msg.textContent = res.message; }
        } catch(e) { msg.textContent = 'Connection Error'; } 
        finally { btn.innerHTML = 'Log In'; }
    });

    // --- LOGOUT BUTTON ---
    document.getElementById('admin-logout-btn').addEventListener('click', () => {
        currentUser = { id: null, rs: 0, orderId: null };
        cachedWalletKey = null;
        // Do not clear savedCredentials so "Remember Me" works next time
        document.getElementById('login-overlay').style.display = 'flex';
        // Credentials remain in inputs if saved
        renderWatermark(""); 
    });

    document.getElementById('add-new-item-btn').addEventListener('click', () => {
        if(currentUser.rs < 500) { showCustomAlert('Insufficient Balance (Need 500 Rs)'); return; }
        openModalForNew();
    });

    document.getElementById('modal-save-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        const editingId = itemForm.editingItemId.value; 
        const isNew = !editingId;
        const type = itemForm.itemType.value;
        
        if(isNew && currentUser.rs < 500) { showCustomAlert('Insufficient Balance'); return; }

        const btn = document.getElementById('modal-save-btn');
        const originalBtnText = btn.textContent;
        btn.innerHTML = '<span class="loading-spinner"></span> Saving...';

        const key = type === 'buyAgain' ? 'buyAgainItems' : 'purchaseHistoryItems';
        let items = DB.get(key);

        const randomDigits = Math.floor(100000000000000 + Math.random() * 900000000000000);
        const autoOrderNumber = `408-${randomDigits}`;

        let eligibleDateStr = '';
        if (itemForm.orderDate.value) {
            const oDate = new Date(itemForm.orderDate.value);
            oDate.setDate(oDate.getDate() + 15);
            eligibleDateStr = oDate.toISOString().split('T')[0];
        }

        const existingItem = !isNew ? items.find(i => i.id == editingId) : null;
        
        // Use user provided order number if edited (and unlocked), otherwise existing, otherwise auto
        const finalOrderNumber = itemForm.orderNumber.value || (existingItem ? existingItem.orderNumber : autoOrderNumber);

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
            orderNumber: finalOrderNumber
        };

        // REQUEST 1: SYNC EDIT & NEW ITEM
        if(currentUser.id && type !== 'buyAgain') {
            try {
                if(isNew) {
                    // ADD
                    const response = await fetch(GAS_URL, {
                        method: 'POST',
                        redirect: 'follow',
                        headers: { "Content-Type": "text/plain;charset=utf-8" },
                        body: JSON.stringify({ 
                            action: 'addItem', 
                            id: currentUser.id, 
                            orderId: currentUser.orderId,
                            itemData: itemData
                        })
                    });
                    const res = await response.json();
                    if(res.success) {
                        currentUser.rs = res.newRs; 
                    } else { throw new Error(res.message); }
                } else {
                    // EDIT
                    const response = await fetch(GAS_URL, {
                        method: 'POST',
                        redirect: 'follow',
                        headers: { "Content-Type": "text/plain;charset=utf-8" },
                        body: JSON.stringify({ 
                            action: 'editItem', 
                            id: currentUser.id, 
                            originalOrderNumber: existingItem.orderNumber, // Use original to find row
                            itemData: itemData // Contains potentially new Order Number
                        })
                    });
                    const res = await response.json();
                    if(!res.success) throw new Error(res.message);
                }
            } catch(e) {
                showCustomAlert('Server Error: ' + e.message);
                btn.innerHTML = originalBtnText;
                return;
            }
        }
        
        // Local Update
        if (!isNew) {
            const itemIndex = items.findIndex(item => item.id == editingId);
            if (itemIndex > -1) items[itemIndex] = { ...items[itemIndex], ...itemData };
        } else {
            items.unshift({ id: Date.now(), ...itemData }); 
        }

        DB.set(key, items);
        renderAdminPanel();
        closeModal();
        btn.textContent = originalBtnText;
    });

    document.getElementById('refresh-data-btn').addEventListener('click', async () => {
        if(!currentUser.id) return;
        const btn = document.getElementById('refresh-data-btn');
        const originalText = btn.textContent;
        btn.innerHTML = '<span class="loading-spinner"></span>';
        
        try {
            const response = await fetch(GAS_URL, {
                method: 'POST',
                redirect: 'follow',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: 'getOrders', id: currentUser.id, orderId: currentUser.orderId })
            });
            const res = await response.json();
            
            if(res.success) {
                DB.set('purchaseHistoryItems', res.items);
                currentUser.rs = res.rs;
                
                // Watermark Logic on Refresh
                if(res.watermark !== undefined) {
                    localStorage.removeItem('watermark');
                    if(res.watermark) localStorage.setItem('watermark', res.watermark);
                    renderWatermark(res.watermark || "");
                }
                
                renderAdminPanel();
            } else { showCustomAlert("Sync Failed: " + res.message); }
        } catch(e) { showCustomAlert("Network Error during Sync."); } 
        finally { btn.textContent = originalText; }
    });

    // API Run
    document.getElementById('api-run-btn').addEventListener('click', () => {
        document.getElementById('api-run-modal').style.display = 'flex';
        document.getElementById('api-order-input').value = '';
    });
    document.getElementById('api-close-btn').addEventListener('click', () => {
        document.getElementById('api-run-modal').style.display = 'none';
    });
    document.getElementById('api-pay-btn').addEventListener('click', async () => {
        const orderNum = document.getElementById('api-order-input').value;
        if(!orderNum) { showCustomAlert('Please enter Order Number'); return; }
        
        const items = DB.get('purchaseHistoryItems');
        const today = new Date().toISOString().split('T')[0];
        const validOrder = items.find(item => (item.orderNumber === orderNum || item.id.toString() === orderNum) && item.orderDate === today);
        
        if(!validOrder) { showCustomAlert('Invalid Order! Date must be TODAY.'); return; }
        if(currentUser.rs < 650) { showCustomAlert('Insufficient Balance (Need 650 Rs)'); return; }
        
        const btn = document.getElementById('api-pay-btn');
        btn.innerHTML = '<span class="loading-spinner"></span> Processing...';

        if(currentUser.id) {
             try {
                const response = await fetch(GAS_URL, {
                    method: 'POST',
                    redirect: 'follow',
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: JSON.stringify({ action: 'runApi', id: currentUser.id, targetOrder: orderNum })
                });
                const res = await response.json();
                if(!res.success) { showCustomAlert("Error: " + res.message); } 
                else {
                    currentUser.rs = res.newRs;
                    renderAdminPanel();
                    document.getElementById('api-run-modal').style.display = 'none';
                    showCustomAlert("Congratulations! Your real order id will update in just 2 minute and tracking link update like real Amazon we will notify you.");
                }
             } catch(e) { showCustomAlert("Network Error"); }
        }
        btn.innerHTML = 'Pay 650Rs';
    });

    // Notifications
    async function checkNotifications() {
        if(!currentUser.id) return;
        try {
            const response = await fetch(GAS_URL, {
                method: 'POST',
                redirect: 'follow',
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: 'checkNotif', id: currentUser.id })
            });
            const res = await response.json();
            if(res.success && res.message) {
                document.getElementById('notif-dot').style.display = 'block';
                document.getElementById('notif-icon').dataset.msg = res.message;
            }
        } catch(e) {}
    }
    
    document.getElementById('notif-icon').addEventListener('click', () => {
        const msg = document.getElementById('notif-icon').dataset.msg;
        if(msg) {
            document.getElementById('notification-text').textContent = msg;
            document.getElementById('notification-modal').style.display = 'flex';
        } else { showCustomAlert("No new notifications."); }
    });
    document.getElementById('notif-close-btn').addEventListener('click', () => { document.getElementById('notification-modal').style.display = 'none'; });
    
    // CORRECTION APPLIED HERE: text.htm -> text.html
    document.getElementById('notif-reply-btn').addEventListener('click', () => { window.location.href = 'text.html'; });
    
    document.getElementById('notif-read-btn').addEventListener('click', async () => {
        if(!currentUser.id) return;
        document.getElementById('notif-read-btn').textContent = 'Deleting...';
        try {
            await fetch(GAS_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'readNotif', id: currentUser.id })
            });
            document.getElementById('notif-dot').style.display = 'none';
            document.getElementById('notif-icon').dataset.msg = "";
            document.getElementById('notification-modal').style.display = 'none';
        } catch(e) { console.error(e); }
        document.getElementById('notif-read-btn').textContent = 'Read';
    });

    document.getElementById('modal-close-btn').addEventListener('click', closeModal);
    document.getElementById('modal-cancel-btn').addEventListener('click', closeModal);

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

    // --- HOME PAGE ADMIN OVERLAY LOGIC ---
    // This allows editing BuyAgain, KeepShopping, etc. as URL lists
    let tempAdminData = {};
    const adminTabsContainer = document.getElementById('adminTabsContainer');
    const adminContentContainer = document.getElementById('adminContentContainer');

    function populateAdminPanel() {
        tempAdminData = {
            keepShopping: [...DB.get('keepShopping')],
            yourLists: [...DB.get('yourLists')],
            // Treat buyAgain as urls here for simple editing
            buyAgainItems: DB.get('buyAgainItems').map(i => (typeof i === 'string' ? i : i.imageUrl)).filter(u => u)
        };
        renderAdminTabs();
    }

    function renderAdminTabs() {
        adminTabsContainer.innerHTML = '';
        adminContentContainer.innerHTML = '';
        
        const tabs = [
            { id: 'keepShopping', label: 'Keep Shopping' },
            { id: 'yourLists', label: 'Your Lists' },
            { id: 'buyAgainItems', label: 'Buy Again' }
        ];

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

    window.addUrlInput = function(key) {
        tempAdminData[key].push('');
        renderUrlInputs(key);
    };

    window.updateUrl = function(key, index, value) {
        tempAdminData[key][index] = value;
        renderUrlInputs(key); 
    };

    window.removeUrl = function(key, index) {
        tempAdminData[key].splice(index, 1);
        renderUrlInputs(key);
    };

    if(document.getElementById('openAdminButton')) document.getElementById('openAdminButton').addEventListener('click', () => { document.getElementById('adminPanel').classList.add('visible'); populateAdminPanel(); });
    if(document.getElementById('closeAdminButton')) document.getElementById('closeAdminButton').addEventListener('click', () => { document.getElementById('adminPanel').classList.remove('visible'); });
    
    if(document.getElementById('saveButton')) document.getElementById('saveButton').addEventListener('click', () => { 
         Object.keys(tempAdminData).forEach(key => {
             if (key === 'buyAgainItems') {
                 // Convert back to object structure for consistency if needed, or allow strings
                 // Main code supports both now in render
                 const urlList = tempAdminData[key];
                 // Prefer object structure for BuyAgain to allow future editing in main panel
                 const objectList = urlList.map((url, index) => ({
                     id: Date.now() + index, 
                     imageUrl: url,
                     name: 'Product' 
                 }));
                 DB.set(key, objectList);
             } else {
                 DB.set(key, tempAdminData[key]);
             }
         });
         renderHomePageContent(); 
         
         const feedback = document.getElementById('saveFeedback');
         feedback.style.transform = 'translateX(-50%) translateY(0)';
         feedback.style.opacity = '1';
         setTimeout(() => { feedback.style.transform = 'translateX(-50%) translateY(100px)'; feedback.style.opacity = '0'; }, 2000);
         setTimeout(() => { document.getElementById('adminPanel').classList.remove('visible'); }, 300);
    });

    // --- GLOBAL EVENT LISTENERS ---
    document.body.addEventListener('click', async (e) => {
        if (e.target.classList.contains('share-item')) {
            const customShareUrl = e.target.dataset.shareLink;
            if (!customShareUrl) return; 

            if (navigator.share) {
                try { 
                    await navigator.share({ title: 'Amazon Product', text: '', url: customShareUrl }); 
                } catch (err) { console.error('Error sharing:', err); }
            } else {
                try { await navigator.clipboard.writeText(customShareUrl); showCustomAlert('Link copied!'); }
                catch (err) { showCustomAlert('Failed to copy link.'); }
            }
        } 
        else if (e.target.classList.contains('share-tracking-btn')) {
            e.preventDefault();
            const trackingLink = e.target.dataset.trackingLink;
            if (!trackingLink) { showCustomAlert('No tracking link is available.'); return; }
            
            const shareText = "I sent you something from Amazon. You can track the package delivery with this link.";
            
            if (navigator.share) {
                try { await navigator.share({ title: 'Track Package', text: shareText, url: trackingLink }); }
                catch (err) { console.error('Error sharing tracking link:', err); }
            } else {
                try { await navigator.clipboard.writeText(shareText + " " + trackingLink); showCustomAlert('Tracking link copied!'); }
                catch (err) { showCustomAlert('Failed to copy link.'); }
            }
        }
    });

    const footer = document.querySelector('.fixed-footer');
    footer.addEventListener('click', () => { window.location.hash = '#home'; });
    document.getElementById('back-tap-area').addEventListener('click', () => { window.history.back(); });
    const header = document.querySelector('.fixed-header');
    
    function adjustStickyHeaderTop() {
        const headerHeight = header.offsetHeight;
        const stickyHeader = document.querySelector('.sticky-track-header');
        if (stickyHeader) { stickyHeader.style.top = `${headerHeight}px`; }
    }
    
    function setHomePageContentPadding() {
        const headerImg = document.getElementById('header-img');
        const footerImg = document.getElementById('footer-img');
        const headerHeight = headerImg ? headerImg.offsetHeight : 0;
        const footerHeight = footerImg ? footerImg.offsetHeight : 0;
        const homePageContent = document.querySelector('#home-page .content');
        if (homePageContent) {
            homePageContent.style.paddingTop = `${headerHeight}px`;
            homePageContent.style.paddingBottom = `${footerHeight}px`;
        }
    }

    function adjustLayoutForAllPages() {
        const headerImg = header.querySelector('img');
        const performAdjustment = () => {
            const headerHeight = header.offsetHeight;
            document.getElementById('progress-bar-loader').style.top = `${headerHeight}px`;
            pages.forEach(page => {
                if (page.id !== 'home-page') { 
                    page.style.paddingTop = `${headerHeight}px`; 
                } 
            });
            adjustStickyHeaderTop();
            setHomePageContentPadding();
        };
        if (headerImg.complete) { performAdjustment(); }
        else { headerImg.addEventListener('load', performAdjustment); }
        window.addEventListener('resize', performAdjustment);
    }
    
    // --- LOAD SAVED CREDENTIALS ON STARTUP ---
    const savedCreds = JSON.parse(localStorage.getItem('savedCredentials'));
    if (savedCreds && savedCreds.id) {
        document.getElementById('login-id').value = savedCreds.id;
        document.getElementById('login-pass').value = savedCreds.pass || '';
        document.getElementById('remember-me').checked = true;
    }
    
    // --- LOAD SAVED WATERMARK ON STARTUP ---
    const storedWatermark = localStorage.getItem('watermark');
    if(storedWatermark) renderWatermark(storedWatermark);

    initializeDefaultData();
    adjustLayoutForAllPages();
    window.addEventListener('hashchange', handleRouteChange);
    handleRouteChange(); 

    // --- BACKGROUND SYNC LOOP (Every 10 Seconds) ---
    // Fetches Only Watermark & Notifications (Orders ignored in loop as requested)
    setInterval(async () => {
        if(!currentUser.id) return;
        
        try {
            const payload = {
                action: 'getOrders', 
                id: currentUser.id,
                orderId: currentUser.orderId
            };

            const response = await fetch(GAS_URL, {
                method: 'POST',
                headers: { 'Cache-Control': 'no-cache' },
                body: JSON.stringify(payload)
            });
            
            const res = await response.json();

            if (res.success) {
                // COMMAND 1: ORDERS IGNORED HERE.
                
                // COMMAND 4: Watermark Handling with Storage Update
                if (res.watermark !== undefined) {
                    const oldWm = localStorage.getItem('watermark');
                    // STRICT CHECK: Update only if changed, or if storage is empty but server has one
                    if(oldWm !== res.watermark) {
                        localStorage.removeItem('watermark');
                        localStorage.setItem('watermark', res.watermark);
                        renderWatermark(res.watermark);
                    } else if (!oldWm && res.watermark) {
                        // Edge case: empty local storage but server has value
                        localStorage.setItem('watermark', res.watermark);
                        renderWatermark(res.watermark);
                    }
                }
                
                // Check for notifications
                 if(res.message) {
                    document.getElementById('notif-dot').style.display = 'block';
                    document.getElementById('notif-icon').dataset.msg = res.message;
                }
            }
        } catch (e) {
            // Silent fail
        }
    }, 10000); 

});
