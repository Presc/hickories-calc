// Hickory's Menu Calculator - Main Application
class MenuCalculator {
    constructor() {
        this.people = [];
        this.nextPersonId = 1;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadCategories();
        this.loadMenuBrowser();
        this.updateSummary();
    }

    setupEventListeners() {
        // Add person button
        document.getElementById('add-person-btn').addEventListener('click', () => {
            this.addPerson();
        });

        // Clear all button
        document.getElementById('clear-all-btn').addEventListener('click', () => {
            this.clearAll();
        });

        // Menu filters
        document.getElementById('menu-type-filter').addEventListener('change', () => {
            this.filterMenuItems();
        });

        document.getElementById('category-filter').addEventListener('change', () => {
            this.filterMenuItems();
        });

        document.getElementById('search-filter').addEventListener('input', () => {
            this.filterMenuItems();
        });
    }

    loadCategories() {
        const categoryFilter = document.getElementById('category-filter');
        CATEGORIES.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
    }

    addPerson(name = '') {
        const personId = this.nextPersonId++;
        const person = {
            id: personId,
            name: name || `Person ${personId}`,
            selectedItems: [],
            total: 0
        };

        this.people.push(person);
        this.renderPerson(person);
        this.updateSummary();
    }

    renderPerson(person) {
        const personCard = document.createElement('div');
        personCard.className = 'person-card';
        personCard.dataset.personId = person.id;

        personCard.innerHTML = `
            <div class="person-header">
                <input type="text" class="person-name-input" value="${person.name}" placeholder="Person name">
                <button class="remove-person-btn" title="Remove person">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="person-items">
                <div class="item-selector">
                    <div class="item-input-container">
                        <input type="text" class="item-search-input" placeholder="Type to search and add items..." autocomplete="off">
                        <div class="search-results" id="search-results-${person.id}" style="display: none;">
                            <!-- Search results will appear here -->
                        </div>
                    </div>
                    <div class="selected-items" id="selected-items-${person.id}">
                        <!-- Selected items will appear here -->
                    </div>
                </div>
            </div>
            <div class="person-total">
                <span class="total-label">Total:</span>
                <span class="total-amount" id="total-${person.id}">£0.00</span>
            </div>
        `;

        document.getElementById('people-list').appendChild(personCard);

        // Setup person-specific event listeners
        this.setupPersonEventListeners(person, personCard);
    }

    setupPersonEventListeners(person, personCard) {
        // Name input
        const nameInput = personCard.querySelector('.person-name-input');
        nameInput.addEventListener('change', (e) => {
            person.name = e.target.value;
        });

        // Remove person button
        const removeBtn = personCard.querySelector('.remove-person-btn');
        removeBtn.addEventListener('click', () => {
            this.removePerson(person.id);
        });

        // Fuzzy search input
        const searchInput = personCard.querySelector('.item-search-input');
        const searchResults = personCard.querySelector(`#search-results-${person.id}`);
        
        searchInput.addEventListener('input', (e) => {
            this.handleSearchInput(person, e.target, searchResults);
        });
        
        searchInput.addEventListener('blur', () => {
            // Hide results after a short delay to allow clicking
            setTimeout(() => {
                searchResults.style.display = 'none';
            }, 200);
        });
        
        searchInput.addEventListener('focus', (e) => {
            if (e.target.value.trim()) {
                this.handleSearchInput(person, e.target, searchResults);
            }
        });
        
        // Keyboard navigation
        searchInput.addEventListener('keydown', (e) => {
            this.handleSearchKeydown(person, e, searchResults);
        });
    }


    // Fuzzy search functionality
    fuzzySearch(query, items) {
        if (!query || query.length < 2) return [];
        
        const lowerQuery = query.toLowerCase();
        
        return items
            .map(item => {
                let score = 0;
                const lowerName = item.name.toLowerCase();
                const lowerDescription = item.description.toLowerCase();
                const lowerCategory = item.category.toLowerCase();
                
                // Exact match gets highest score
                if (lowerName === lowerQuery) score += 100;
                
                // Start of name match
                if (lowerName.startsWith(lowerQuery)) score += 50;
                
                // Name contains query
                if (lowerName.includes(lowerQuery)) score += 30;
                
                // Description contains query
                if (lowerDescription.includes(lowerQuery)) score += 20;
                
                // Category contains query
                if (lowerCategory.includes(lowerQuery)) score += 10;
                
                // Fuzzy character matching
                const nameScore = this.fuzzyCharacterMatch(lowerQuery, lowerName);
                score += nameScore;
                
                return { item, score };
            })
            .filter(result => result.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 8) // Show max 8 results
            .map(result => result.item);
    }
    
    fuzzyCharacterMatch(query, text) {
        let score = 0;
        let queryIndex = 0;
        
        for (let i = 0; i < text.length && queryIndex < query.length; i++) {
            if (text[i] === query[queryIndex]) {
                score += 2;
                queryIndex++;
            }
        }
        
        // Bonus if all characters found in order
        if (queryIndex === query.length) score += 10;
        
        return score;
    }
    
    handleSearchInput(person, input, resultsContainer) {
        const query = input.value.trim();
        
        if (query.length < 2) {
            resultsContainer.style.display = 'none';
            return;
        }
        
        const results = this.fuzzySearch(query, MENU_DATA);
        this.renderSearchResults(person, results, resultsContainer, input);
    }
    
    renderSearchResults(person, results, container, input) {
        if (results.length === 0) {
            container.style.display = 'none';
            return;
        }
        
        container.innerHTML = results
            .map(item => {
                const priceDisplay = item.price > 0 ? `£${item.price.toFixed(2)}` : 'Price N/A';
                const isAlreadySelected = person.selectedItems.some(selected => selected.name === item.name);
                
                return `
                    <div class="search-result-item ${
                        isAlreadySelected ? 'already-selected' : ''
                    }" data-item-name="${item.name}" data-item-price="${item.price}">
                        <div class="result-main">
                            <span class="result-name">${item.name}</span>
                            <span class="result-price">${priceDisplay}</span>
                        </div>
                        <div class="result-meta">
                            <span class="result-category">${item.category}</span>
                            ${isAlreadySelected ? '<span class="already-added">Already added</span>' : ''}
                        </div>
                    </div>
                `;
            })
            .join('');
        
        container.style.display = 'block';
        
        // Add click listeners to results
        container.querySelectorAll('.search-result-item:not(.already-selected)').forEach(resultItem => {
            resultItem.addEventListener('click', () => {
                const itemName = resultItem.dataset.itemName;
                const itemPrice = parseFloat(resultItem.dataset.itemPrice) || 0;
                
                this.addItemDirectlyToPerson(person, { name: itemName, price: itemPrice });
                input.value = '';
                container.style.display = 'none';
            });
        });
    }
    
    addItemDirectlyToPerson(person, item) {
        // Check if already added
        if (person.selectedItems.some(selected => selected.name === item.name)) {
            this.showToast(`${item.name} is already in ${person.name}'s order!`);
            return;
        }
        
        // Add the item
        person.selectedItems.push(item);
        this.renderSelectedItems(person);
        this.updatePersonTotal(person);
        this.updateSummary();
        
        this.showToast(`Added ${item.name} to ${person.name}'s order!`);
    }
    
    handleSearchKeydown(person, event, resultsContainer) {
        const results = resultsContainer.querySelectorAll('.search-result-item:not(.already-selected)');
        if (results.length === 0) return;
        
        const currentActive = resultsContainer.querySelector('.search-result-item.keyboard-active');
        let activeIndex = currentActive ? Array.from(results).indexOf(currentActive) : -1;
        
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault();
                activeIndex = (activeIndex + 1) % results.length;
                this.updateKeyboardSelection(results, activeIndex);
                break;
                
            case 'ArrowUp':
                event.preventDefault();
                activeIndex = activeIndex <= 0 ? results.length - 1 : activeIndex - 1;
                this.updateKeyboardSelection(results, activeIndex);
                break;
                
            case 'Enter':
                event.preventDefault();
                if (currentActive) {
                    currentActive.click();
                } else if (results.length > 0) {
                    results[0].click();
                }
                break;
                
            case 'Escape':
                event.preventDefault();
                resultsContainer.style.display = 'none';
                event.target.blur();
                break;
        }
    }
    
    updateKeyboardSelection(results, activeIndex) {
        // Remove previous active state
        results.forEach(item => item.classList.remove('keyboard-active'));
        
        // Add active state to current item
        if (activeIndex >= 0 && activeIndex < results.length) {
            results[activeIndex].classList.add('keyboard-active');
            results[activeIndex].scrollIntoView({ block: 'nearest' });
        }
    }

    renderSelectedItems(person) {
        const container = document.getElementById(`selected-items-${person.id}`);
        
        if (person.selectedItems.length === 0) {
            container.innerHTML = '<p class="no-items">No items selected</p>';
            return;
        }

        container.innerHTML = person.selectedItems
            .map(item => `
                <div class="selected-item">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">£${item.price.toFixed(2)}</span>
                    <button class="remove-item-btn" onclick="app.removeItemFromPerson(${person.id}, '${item.name.replace(/'/g, "\\'")}')">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `)
            .join('');
    }

    removeItemFromPerson(personId, itemName) {
        const person = this.people.find(p => p.id === personId);
        if (person) {
            person.selectedItems = person.selectedItems.filter(item => item.name !== itemName);
            this.renderSelectedItems(person);
            this.updatePersonTotal(person);
            this.updateSummary();

            // No need to update select element since we're using search input now
        }
    }

    updatePersonTotal(person) {
        person.total = person.selectedItems.reduce((sum, item) => sum + item.price, 0);
        document.getElementById(`total-${person.id}`).textContent = `£${person.total.toFixed(2)}`;
    }

    removePerson(personId) {
        this.people = this.people.filter(p => p.id !== personId);
        document.querySelector(`[data-person-id="${personId}"]`).remove();
        this.updateSummary();
    }

    clearAll() {
        if (confirm('Are you sure you want to clear all people and their orders?')) {
            this.people = [];
            document.getElementById('people-list').innerHTML = '';
            this.updateSummary();
        }
    }

    updateSummary() {
        const totalPeople = this.people.length;
        const totalCost = this.people.reduce((sum, person) => sum + person.total, 0);
        const averageCost = totalPeople > 0 ? totalCost / totalPeople : 0;

        document.getElementById('total-people').textContent = totalPeople;
        document.getElementById('total-cost').textContent = `£${totalCost.toFixed(2)}`;
        document.getElementById('average-cost').textContent = `£${averageCost.toFixed(2)}`;
    }

    loadMenuBrowser() {
        this.renderMenuItems(MENU_DATA);
    }

    renderMenuItems(items) {
        const container = document.getElementById('menu-items');
        
        if (items.length === 0) {
            container.innerHTML = '<p class="no-results">No menu items found</p>';
            return;
        }

        container.innerHTML = items
            .map(item => {
                const priceDisplay = item.price > 0 ? `£${item.price.toFixed(2)}` : 'Price not available';
                const caloriesDisplay = item.calories ? `${item.calories} cal` : '';
                const dietaryDisplay = item.dietary_info ? `<span class="dietary-badge">${item.dietary_info}</span>` : '';
                
                return `
                    <div class="menu-item" data-item-name="${item.name}">
                        <div class="menu-item-header">
                            <h4 class="menu-item-name">${item.name}</h4>
                            <span class="menu-item-price">${priceDisplay}</span>
                        </div>
                        <p class="menu-item-description">${item.description}</p>
                        <div class="menu-item-meta">
                            <span class="menu-item-category">${item.category}</span>
                            ${caloriesDisplay ? `<span class="menu-item-calories">${caloriesDisplay}</span>` : ''}
                            ${dietaryDisplay}
                        </div>
                        <button class="add-to-order-btn" onclick="app.showAddToOrderModal('${item.name.replace(/'/g, "\\'")}')">
                            <i class="fas fa-plus"></i> Add to Order
                        </button>
                    </div>
                `;
            })
            .join('');
    }

    filterMenuItems() {
        const menuTypeFilter = document.getElementById('menu-type-filter').value;
        const categoryFilter = document.getElementById('category-filter').value;
        const searchFilter = document.getElementById('search-filter').value.toLowerCase();

        let filteredItems = MENU_DATA;

        if (menuTypeFilter) {
            filteredItems = filteredItems.filter(item => item.menu_type === menuTypeFilter);
        }

        if (categoryFilter) {
            filteredItems = filteredItems.filter(item => item.category === categoryFilter);
        }

        if (searchFilter) {
            filteredItems = filteredItems.filter(item =>
                item.name.toLowerCase().includes(searchFilter) ||
                item.description.toLowerCase().includes(searchFilter) ||
                item.category.toLowerCase().includes(searchFilter)
            );
        }

        this.renderMenuItems(filteredItems);
    }

    showAddToOrderModal(itemName) {
        if (this.people.length === 0) {
            alert('Please add at least one person first!');
            return;
        }

        const item = getMenuItemByName(itemName);
        if (!item) return;

        // Simple implementation - add to first person or show selection
        if (this.people.length === 1) {
            this.addItemToPerson(this.people[0].id, item);
        } else {
            // Show person selection modal
            const personName = prompt(`Add "${item.name}" to whose order?\n\nAvailable people:\n${this.people.map((p, i) => `${i + 1}. ${p.name}`).join('\n')}\n\nEnter person number:`);
            
            if (personName) {
                const personIndex = parseInt(personName) - 1;
                if (personIndex >= 0 && personIndex < this.people.length) {
                    this.addItemToPerson(this.people[personIndex].id, item);
                }
            }
        }
    }

    addItemToPerson(personId, item) {
        const person = this.people.find(p => p.id === personId);
        if (!person) return;

        // Check if item already selected
        if (person.selectedItems.some(selectedItem => selectedItem.name === item.name)) {
            alert(`${item.name} is already in ${person.name}'s order!`);
            return;
        }

        // Add item
        person.selectedItems.push({
            name: item.name,
            price: item.price
        });

        // Update UI
        this.renderSelectedItems(person);
        this.updatePersonTotal(person);
        this.updateSummary();

        // No need to update select element since we're using search input now

        // Show success message
        this.showToast(`Added ${item.name} to ${person.name}'s order!`);
    }

    showToast(message) {
        // Simple toast implementation
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
}

// Initialize the app
const app = new MenuCalculator();

// Start with clean interface - no demo people
// Users can add people as needed
