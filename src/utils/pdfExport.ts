import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

/**
 * Force inline styles on a cloned DOM tree so html2canvas renders
 * the layout correctly even when Tailwind CSS classes aren't resolved
 * (e.g. on Vercel cold-start or lazy CSS loading).
 */
function applyInlineStyles(container: HTMLElement) {
    // ── Root container ──
    container.style.width = '800px';
    container.style.padding = '15px';
    container.style.margin = '0';
    container.style.backgroundColor = '#ffffff';
    container.style.fontFamily = 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif';
    container.style.color = '#1f2937';
    container.style.boxSizing = 'border-box';

    // ── All headers ──
    container.querySelectorAll('h1, h2, h3, h4').forEach(el => {
        const h = el as HTMLElement;
        h.style.textAlign = 'center';
        h.style.fontWeight = 'bold';
        h.style.margin = '0 0 8px 0';
    });

    // ── SVG diagram wrapper ──
    const svgWrapper = container.querySelector('.w-full.flex.justify-center') as HTMLElement;
    if (svgWrapper) {
        svgWrapper.style.display = 'flex';
        svgWrapper.style.justifyContent = 'center';
        svgWrapper.style.width = '100%';
        svgWrapper.style.padding = '16px 0';
        svgWrapper.style.position = 'relative';
    }

    const svg = container.querySelector('svg') as SVGElement;
    if (svg) {
        svg.style.width = '100%';
        svg.style.maxWidth = '720px';
        svg.style.height = 'auto';
        svg.style.overflow = 'visible';
    }

    // ── Form card wrapper ──
    const formCard = container.querySelector('.bg-white.p-6.rounded-lg') as HTMLElement;
    if (formCard) {
        formCard.style.backgroundColor = '#ffffff';
        formCard.style.padding = '16px';
        formCard.style.borderRadius = '8px';
        formCard.style.border = '1px solid #e5e7eb';
    }

    // ── Force grid layouts ──
    // "Datos de Inspección" top row (4 cols)
    const grids4 = container.querySelectorAll('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4');
    grids4.forEach(g => {
        const el = g as HTMLElement;
        el.style.display = 'grid';
        el.style.gridTemplateColumns = 'repeat(4, 1fr)';
        el.style.gap = '16px';
        el.style.marginBottom = '16px';
    });

    // Migration row (4 cols)
    const gridsSm4 = container.querySelectorAll('.grid.grid-cols-1.sm\\:grid-cols-2.lg\\:grid-cols-4');
    gridsSm4.forEach(g => {
        const el = g as HTMLElement;
        el.style.display = 'grid';
        el.style.gridTemplateColumns = 'repeat(4, 1fr)';
        el.style.gap = '12px';
    });

    // Temperature stations (4 cols)
    const gridsMd4 = container.querySelectorAll('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4');
    gridsMd4.forEach(g => {
        const el = g as HTMLElement;
        el.style.display = 'grid';
        el.style.gridTemplateColumns = 'repeat(4, 1fr)';
        el.style.gap = '16px';
    });

    // 2-column sub-grids
    const grids2 = container.querySelectorAll('.grid.grid-cols-2');
    grids2.forEach(g => {
        const el = g as HTMLElement;
        el.style.display = 'grid';
        el.style.gridTemplateColumns = 'repeat(2, 1fr)';
        el.style.gap = '8px';
    });

    // ── Station cards ──
    container.querySelectorAll('.bg-gray-50').forEach(el => {
        const card = el as HTMLElement;
        card.style.backgroundColor = '#f9fafb';
        card.style.padding = '12px';
        card.style.borderRadius = '6px';
        card.style.border = '1px solid #e5e7eb';
    });

    // ── All inputs & selects ──
    container.querySelectorAll('input, select').forEach(el => {
        const inp = el as HTMLElement;
        // Skip diagram inputs – they live inside SVG foreignObject
        if (inp.classList.contains('diagram-input')) return;

        inp.style.height = '32px';
        inp.style.lineHeight = '32px';
        inp.style.fontSize = '14px';
        inp.style.padding = '0 8px';
        inp.style.boxSizing = 'border-box';
        inp.style.border = '1px solid #000';
        inp.style.borderRadius = '4px';
        inp.style.verticalAlign = 'middle';
        inp.style.textAlign = 'center';
        inp.style.width = '100%';
        inp.style.fontWeight = 'bold';
        inp.style.color = '#1f2937';
        inp.style.backgroundColor = '#f3f4f6';
        inp.style.webkitAppearance = 'none';
    });

    // Read-only inputs with explicit black border already have it via className,
    // but force it inline for safety
    container.querySelectorAll('input.border-black, input[readonly]').forEach(el => {
        const inp = el as HTMLElement;
        inp.style.border = '1px solid #000';
    });

    // Specific form fields alignment
    container.querySelectorAll('input[name="date"], input[name="feed"], input[name="rpm"], select[name="technician"]').forEach(el => {
        const inp = el as HTMLElement;
        inp.style.textAlign = 'left';
        inp.style.paddingLeft = '8px';
    });

    // ── Labels ──
    container.querySelectorAll('label').forEach(el => {
        const lbl = el as HTMLElement;
        lbl.style.display = 'block';
        lbl.style.fontSize = lbl.classList.contains('text-xs') ? '10px' : '13px';
        lbl.style.fontWeight = lbl.classList.contains('font-semibold') ? '600' : '400';
        lbl.style.marginBottom = '2px';
        lbl.style.color = lbl.classList.contains('text-gray-500') ? '#6b7280' : '#374151';
    });

    // ── Relative wrappers for unit badges (°C, mm) ──
    container.querySelectorAll('.relative').forEach(el => {
        const rel = el as HTMLElement;
        rel.style.position = 'relative';
    });

    container.querySelectorAll('.relative > span.absolute, .relative > span[class*="absolute"]').forEach(el => {
        const span = el as HTMLElement;
        span.style.position = 'absolute';
        span.style.fontSize = '10px';
        span.style.pointerEvents = 'none';
        // Position in top-right area
        if (!span.style.right) span.style.right = '4px';
        if (!span.style.top) span.style.top = '4px';
    });

    // ── Textarea for observations ──
    container.querySelectorAll('textarea').forEach(el => {
        const ta = el as HTMLElement;
        ta.style.width = '100%';
        ta.style.minHeight = '80px';
        ta.style.padding = '8px';
        ta.style.border = '1px solid #d1d5db';
        ta.style.borderRadius = '8px';
        ta.style.fontSize = '13px';
        ta.style.lineHeight = '1.5';
        ta.style.backgroundColor = '#f9fafb';
        ta.style.textAlign = 'left';
        ta.style.boxSizing = 'border-box';
        ta.style.resize = 'none';
    });

    // ── Diagram inputs inside SVG foreignObject ──
    container.querySelectorAll('.diagram-input').forEach(el => {
        const inp = el as HTMLElement;
        inp.style.width = '100%';
        inp.style.height = '100%';
        inp.style.textAlign = 'center';
        inp.style.fontSize = '11px';
        inp.style.fontWeight = 'bold';
        inp.style.border = '2px solid #000';
        inp.style.outline = 'none';
        inp.style.backgroundColor = '#ffffff';
        inp.style.padding = '0';
        inp.style.boxSizing = 'border-box';

        // Blue empuje inputs
        if (inp.classList.contains('border-blue-800')) {
            inp.style.border = '3px solid #1e40af';
            inp.style.backgroundColor = '#eff6ff';
        }

        // Thicker border inputs (Andes, Pacifico, inner)
        if (inp.classList.contains('border-\\[3px\\]') || inp.className.includes('border-[3px]')) {
            inp.style.borderWidth = '3px';
        }
    });

    // ── Hide footer text (will be drawn by jsPDF) ──
    container.querySelectorAll('.text-right p').forEach(el => {
        (el as HTMLElement).style.display = 'none';
    });

    // ── Borders on section dividers ──
    container.querySelectorAll('.border-b').forEach(el => {
        (el as HTMLElement).style.borderBottom = '1px solid #e5e7eb';
    });
    container.querySelectorAll('.border-t').forEach(el => {
        (el as HTMLElement).style.borderTop = '1px solid #e5e7eb';
    });
}

export const exportToPDF = async (elementId: string, filename: string = 'Ficha_Inspeccion.pdf') => {
    const element = document.getElementById(elementId);
    if (!element) return false;

    try {
        // Reset scroll position to top to avoid html2canvas cutoff bugs
        window.scrollTo(0, 0);

        // ────────────────────────────────────────────
        // 1. Create off-screen static container (800px)
        // ────────────────────────────────────────────
        const offscreenContainer = document.createElement('div');
        offscreenContainer.style.position = 'fixed';
        offscreenContainer.style.left = '-9999px';
        offscreenContainer.style.top = '0';
        offscreenContainer.style.width = '800px';
        offscreenContainer.style.zIndex = '-9999';
        offscreenContainer.style.overflow = 'visible';
        offscreenContainer.style.backgroundColor = '#ffffff';

        // Clone the report DOM
        const clone = element.cloneNode(true) as HTMLElement;
        clone.removeAttribute('id'); // avoid duplicate IDs

        offscreenContainer.appendChild(clone);
        document.body.appendChild(offscreenContainer);

        // ────────────────────────────────────────────
        // 2. Remove the HTML title to avoid overlap
        // ────────────────────────────────────────────
        const htmlTitle = clone.querySelector('.show-on-print');
        if (htmlTitle) {
            htmlTitle.remove();
        }

        // ────────────────────────────────────────────
        // 3. Hide no-print elements in the clone
        // ────────────────────────────────────────────
        clone.querySelectorAll('.no-print').forEach(el => {
            (el as HTMLElement).style.display = 'none';
        });

        // ────────────────────────────────────────────
        // 3b. Sync form values so html2canvas can see them
        // ────────────────────────────────────────────
        // Sync all inputs: copy .value into the DOM attribute
        const origInputs = element.querySelectorAll('input, textarea');
        const cloneInputs = clone.querySelectorAll('input, textarea');
        origInputs.forEach((orig, i) => {
            const cl = cloneInputs[i] as HTMLInputElement | HTMLTextAreaElement | undefined;
            if (cl) {
                cl.setAttribute('value', (orig as HTMLInputElement).value);
                cl.value = (orig as HTMLInputElement).value;
            }
        });

        // Replace <select> with <span> showing the selected text
        const origSelects = element.querySelectorAll('select');
        const cloneSelects = clone.querySelectorAll('select');
        cloneSelects.forEach((sel, i) => {
            const origSel = origSelects[i] as HTMLSelectElement | undefined;
            const span = document.createElement('span');
            // Use .value directly — React controlled selects set .value but
            // selectedIndex may not reflect it. The option values === display text.
            const selectedText = origSel?.value || (sel as HTMLSelectElement).value || '';
            span.textContent = selectedText;
            // Copy the select's inline styling expectations
            span.style.display = 'block';
            span.style.width = '100%';
            span.style.height = '32px';
            span.style.lineHeight = '32px';
            span.style.fontSize = '14px';
            span.style.padding = '0 8px';
            span.style.boxSizing = 'border-box';
            span.style.border = '1px solid #d1d5db';
            span.style.borderRadius = '4px';
            span.style.backgroundColor = '#ffffff';
            span.style.color = '#1f2937';
            span.style.textAlign = 'left';
            span.style.paddingLeft = '8px';
            span.style.overflow = 'hidden';
            span.style.whiteSpace = 'nowrap';
            sel.parentNode?.replaceChild(span, sel);
        });

        // ────────────────────────────────────────────
        // 4. Force inline styles on the clone
        // ────────────────────────────────────────────
        applyInlineStyles(clone);

        // Brief delay to let the DOM settle
        await new Promise(resolve => setTimeout(resolve, 100));

        // ────────────────────────────────────────────
        // 5. Capture with html2canvas
        // ────────────────────────────────────────────
        const canvas = await html2canvas(clone, {
            scale: 2,
            useCORS: true,
            logging: true,
            backgroundColor: '#ffffff',
            width: 800,
            windowWidth: 800,
        });

        // ────────────────────────────────────────────
        // 6. Cleanup: remove off-screen container
        // ────────────────────────────────────────────
        document.body.removeChild(offscreenContainer);

        const imgData = canvas.toDataURL('image/jpeg', 1.0);

        // ────────────────────────────────────────────
        // 7. Build the PDF
        // ────────────────────────────────────────────
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfPageWidth = pdf.internal.pageSize.getWidth();
        const pdfPageHeight = pdf.internal.pageSize.getHeight();

        // Draw Title directly in jsPDF
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.setTextColor(40, 40, 40);
        pdf.text("Reporte de Inspección Horno de Cal L-2 - Arauco", 105, 15, { align: "center" });

        // Layout constraints
        const marginX = 10;
        const startY = 25;
        const marginYBottom = 10;

        const availableWidth = pdfPageWidth - (marginX * 2);
        const availableHeight = pdfPageHeight - startY - marginYBottom;

        let imgWidth = canvas.width;
        let imgHeight = canvas.height;

        let ratio = availableWidth / imgWidth;
        let scaledWidth = availableWidth;
        let scaledHeight = imgHeight * ratio;

        if (scaledHeight > availableHeight) {
            ratio = availableHeight / imgHeight;
            scaledHeight = availableHeight;
            scaledWidth = imgWidth * ratio;
        }

        const xOffset = (pdfPageWidth - scaledWidth) / 2;
        pdf.addImage(imgData, 'JPEG', xOffset, startY, scaledWidth, scaledHeight);

        // Footer
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.setFont("helvetica", "italic");
        pdf.text("Created by Gilbert Retamal Silva", pdfPageWidth - marginX, pdfPageHeight - 8, { align: "right" });

        // ────────────────────────────────────────────
        // 8. Download
        // ────────────────────────────────────────────
        const pdfBlob = pdf.output('blob');
        const defaultFilename = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;

        const blobUrl = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = blobUrl;
        link.download = defaultFilename;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);

        return true;
    } catch (error) {
        console.error('Error generating PDF:', error);
        return false;
    }
};
