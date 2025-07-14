$(function () {
    const $tableContainer = $('#table-container');
    const $search = $('#search');
    const $refresh = $('#refresh');
    const $loading = $('#loading-overlay');
    let sortState = { index: -1, order: null };

    // ==============================
    // Theme Toggle
    // ==============================
    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        $('#theme-label').text(theme === 'dark' ? '🌙' : '☀️');
        $('#theme-toggle').attr('aria-checked', theme === 'dark');
    }

    const savedTheme = localStorage.getItem('theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(savedTheme);

    $('#theme-toggle').on('click keydown', function (e) {
        if (e.type === 'click' || (e.type === 'keydown' && (e.key === 'Enter' || e.key === ' '))) {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            applyTheme(next);
            e.preventDefault();
        }
    });

    // ==============================
    // Natural Compare Function
    // ==============================
    function naturalCompare(a, b) {
        const ax = [], bx = [];

        a.replace(/(\d+)|(\D+)/g, (_, $1, $2) => {
            ax.push([$1 !== undefined ? parseInt($1, 10) : Infinity, $2 || ""]);
        });
        b.replace(/(\d+)|(\D+)/g, (_, $1, $2) => {
            bx.push([$1 !== undefined ? parseInt($1, 10) : Infinity, $2 || ""]);
        });

        while (ax.length && bx.length) {
            const an = ax.shift();
            const bn = bx.shift();

            if (an[0] !== bn[0]) return an[0] - bn[0];
            const aText = an[1].toLowerCase();
            const bText = bn[1].toLowerCase();
            if (aText !== bText) return aText < bText ? -1 : 1;
        }

        return ax.length - bx.length;
    }

    // ==============================
    // DSE Table Functions
    // ==============================
    function showLoading() {
        $loading.addClass('active');
        $tableContainer.attr('aria-busy', 'true');
    }

    function hideLoading() {
        $loading.removeClass('active');
        $tableContainer.attr('aria-busy', 'false');
    }

    function fetchData() {
        showLoading();
        $.ajax({
            url: 'https://corsproxy.io/?https://www.dsebd.org/latest_share_price_scroll_l.php',
            method: 'GET',
            success: function (data) {
                const html = $('<div>').html(data);
                const table = html.find('table.shares-table').first();
                if (!table.length) {
                    $tableContainer.html('<p style="padding:10px;color:#cc0000;">Table not found</p>');
                    hideLoading();
                    return;
                }
                table.attr('id', 'dse-table');
                $tableContainer.html(table);
                addSortingIcons();
                bindSorting();
                bindSearch();
                hideLoading();
            },
            error: function () {
                $tableContainer.html('<p style="padding:10px;color:#cc0000;">Failed to load data</p>');
                hideLoading();
            }
        });
    }

    function addSortingIcons() {
        $('#dse-table thead th').each(function () {
            if (!$(this).find('.sort-icon').length) {
                $(this).append('<span class="sort-icon">&#x21D5;</span>');
            }
        });
    }

    function bindSorting() {
        $('#dse-table thead th').off('click').on('click', function () {
            const index = $(this).index();
            const order = sortState.index === index && sortState.order === 'asc' ? 'desc' : 'asc';
            sortState = { index, order };
            sortTable(index, order);
        });
    }

    function sortTable(index, order) {
        showLoading();
        setTimeout(() => {
            const rows = Array.from(document.querySelectorAll('#dse-table tbody tr'));

            const data = rows.map(row => {
                const text = row.cells[index]?.textContent?.trim() || '';
                return { row, value: text };
            });

            const isNumeric = data.every(d => !isNaN(parseFloat(d.value.replace(/,/g, ''))));

            data.sort((a, b) => {
                if (isNumeric) {
                    const numA = parseFloat(a.value.replace(/,/g, ''));
                    const numB = parseFloat(b.value.replace(/,/g, ''));
                    return order === 'asc' ? numA - numB : numB - numA;
                } else {
                    return order === 'asc'
                        ? naturalCompare(a.value, b.value)
                        : naturalCompare(b.value, a.value);
                }
            });

            const fragment = document.createDocumentFragment();
            data.forEach(item => fragment.appendChild(item.row));

            const tbody = document.querySelector('#dse-table tbody');
            tbody.innerHTML = '';
            tbody.appendChild(fragment);

            $('#dse-table thead th .sort-icon').html('&#x21D5;').parent().removeClass('sorted-asc sorted-desc');
            const arrow = order === 'asc' ? '&#x25B2;' : '&#x25BC;';
            $('#dse-table thead th').eq(index).find('.sort-icon').html(arrow).parent().addClass(`sorted-${order}`);

            hideLoading();
        }, 10);
    }

    function bindSearch() {
        $search.off('input').on('input', function () {
            const val = $(this).val().toLowerCase();
            $('#dse-table tbody tr').each(function () {
                const name = this.cells[1]?.textContent.toLowerCase();
                $(this).toggle(name.includes(val));
            });
        });
    }

    // ==============================
    // Tab Switching & TradingView
    // ==============================
    let tradingViewWidget = null;

    function loadTradingViewChart() {
        if (tradingViewWidget) return;
        tradingViewWidget = new TradingView.widget({
            width: "100%",
            height: "100%",
            symbol: "FXOpen:XAUUSD",
            interval: "1",
            timezone: "Asia/Dhaka",
            hide_top_toolbar: true,
            hide_legend: true,
            range: "1D",
            theme: document.documentElement.getAttribute('data-theme') === 'dark' ? "dark" : "light",
            style: "1",
            hotlist: true,
            locale: "en",
            toolbar_bg: "#fff",
            enable_publishing: false,
            hide_side_toolbar: true,
            allow_symbol_change: false,
            hide_volume: true,
            calendar: true,
            save_image: false,
            details: true,
            container_id: "tradingview_gold"
        });
    }

    $('#btn-dse').on('click', function () {
        if ($(this).hasClass('active')) return;
        $('#btn-gold').removeClass('active').attr('aria-pressed', 'false');
        $(this).addClass('active').attr('aria-pressed', 'true');
        $('#gold-content').hide();
        $('#dse-content').show();
        fetchData();
    });

    $('#btn-gold').on('click', function () {
        if ($(this).hasClass('active')) return;
        $('#btn-dse').removeClass('active').attr('aria-pressed', 'false');
        $(this).addClass('active').attr('aria-pressed', 'true');
        $('#dse-content').hide();
        $('#gold-content').show();
        loadTradingViewChart();
    });

    $refresh.on('click', () => {
        $search.val('');
        fetchData();
    });

    // Initial Load
    fetchData();
});
