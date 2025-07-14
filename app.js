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

    function naturalCompare(a, b) {
        const ax = [], bx = [];
        a.replace(/(\d+)|(\D+)/g, (_, $1, $2) => ax.push([$1 || Infinity, $2 || ""]));
        b.replace(/(\d+)|(\D+)/g, (_, $1, $2) => bx.push([$1 || Infinity, $2 || ""]));
        while (ax.length && bx.length) {
            const an = ax.shift(), bn = bx.shift();
            if (an[0] !== bn[0]) return an[0] - bn[0];
            if (an[1].toLowerCase() !== bn[1].toLowerCase())
                return an[1].toLowerCase() < bn[1].toLowerCase() ? -1 : 1;
        }
        return ax.length - bx.length;
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
            const data = [];
            $('#dse-table tbody tr').each(function () {
                const cells = $(this).children().map((_, td) => $(td).text().trim()).get();
                data.push({ row: this, cells });
            });

            const isNumeric = !isNaN(parseFloat(data[0]?.cells[index]?.replace(/,/g, '')));

            data.sort((a, b) => {
                let A = a.cells[index].replace(/,/g, '');
                let B = b.cells[index].replace(/,/g, '');

                if (index === 1) {
                    return order === 'asc' ? naturalCompare(A, B) : naturalCompare(B, A);
                }

                if (isNumeric) {
                    return order === 'asc' ? parseFloat(A) - parseFloat(B) : parseFloat(B) - parseFloat(A);
                }

                return order === 'asc' ? A.localeCompare(B) : B.localeCompare(A);
            });

            const $tbody = $('#dse-table tbody').empty();
            data.forEach(item => $tbody.append(item.row));

            $('#dse-table thead th .sort-icon').html('&#x21D5;').parent().removeClass('sorted-asc sorted-desc');
            const arrow = order === 'asc' ? '&#x25B2;' : '&#x25BC;';
            $('#dse-table thead th').eq(index).find('.sort-icon').html(arrow).parent().addClass(`sorted-${order}`);

            hideLoading();
        }, 20);
    }

    function bindSearch() {
        $search.off('input').on('input', function () {
            const val = $(this).val().toLowerCase();
            $('#dse-table tbody tr').each(function () {
                const name = $(this).children().eq(1).text().toLowerCase();
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
