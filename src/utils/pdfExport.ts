import html2canvas from 'html2canvas-pro';
import { jsPDF } from 'jspdf';

export const exportToPDF = async (elementId: string, filename: string = 'Ficha_Inspeccion.pdf') => {
    const element = document.getElementById(elementId);
    if (!element) return false;

    try {
        // Reset scroll position to top to avoid html2canvas cutoff bugs
        window.scrollTo(0, 0);

        // Hide non-printable elements
        const nonPrintableElements = element.querySelectorAll('.no-print');
        nonPrintableElements.forEach(el => {
            (el as HTMLElement).style.display = 'none';
        });

        // Create temporary stylesheet for forcing PDF layout alignments
        const style = document.createElement('style');
        style.innerHTML = `
            /* Ensure the root captures without cutting edges */
            #${elementId} {
                padding: 15px !important;
                margin: 0 !important;
            }

            /* Bulletproof Horizontal/Vertical Centering for html2canvas */
            #${elementId} input, 
            #${elementId} select {
                -webkit-appearance: none !important;
                appearance: none !important;
                height: 28px !important;
                line-height: 28px !important;
                font-size: 12px !important;
                padding: 0 !important;
                box-sizing: border-box !important;
                border: none !important;
                vertical-align: middle !important;
            }

            /* Additional cleanups for standard form inputs (hide backgrounds, center text) */
            #${elementId} input:not(.diagram-input), 
            #${elementId} select {
                text-align: center !important;
                margin: 0 auto !important;
                background-color: transparent !important;
                overflow: hidden !important;
            }
            
            /* Align Fecha, Técnico, Alimentación, RPM to Left with globally stable vertical centering */
            #${elementId} input[name="date"],
            #${elementId} input[name="technician"],
            #${elementId} input[name="feed"],
            #${elementId} input[name="rpm"],
            #${elementId} select[name="technician"] {
                text-align: left !important;
                height: 28px !important;
                line-height: 28px !important;
                padding: 0 0 0 8px !important; /* Only left padding, remove vertical offsets */
            }
            
            /* Center main grid cells for temperature section only */
            #${elementId} .grid > div {
                text-align: center !important;
            }
            
            /* Center main headers */
            #${elementId} h2, #${elementId} h3, #${elementId} h4 {
                text-align: center !important;
            }
            
            /* EXCEPTION: Observations field must be left-aligned and start at the top */
            #${elementId} textarea[name="observations"] {
                text-align: left !important;
                display: block !important;
                background-color: transparent !important;
                line-height: 1.5 !important;
                padding: 8px 5px !important; /* Top padding + 5px Left Padding */
                page-break-inside: avoid !important;
            }
            
            /* Hide the HTML footer to draw it rigidly in the PDF */
            #${elementId} .text-right p.text-gray-400 {
                display: none !important;
            }
        `;
        document.head.appendChild(style);

        // Capture canvas with precise DOM width/height to avoid responsive skewing and edge clipping
        const targetWidth = element.offsetWidth || 1200; // default fallback
        const targetHeight = element.offsetHeight || 1600;

        const canvas = await html2canvas(element, {
            scale: 2,
            useCORS: true,
            logging: true,
            backgroundColor: '#ffffff',
            width: targetWidth,
            height: targetHeight,
            windowWidth: targetWidth, // Lock window width to exactly the element width
            windowHeight: targetHeight,
        });

        // Restore DOM
        document.head.removeChild(style);

        nonPrintableElements.forEach(el => {
            (el as HTMLElement).style.display = '';
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);

        // Setup A4 portrait PDF logic
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfPageWidth = pdf.internal.pageSize.getWidth();
        const pdfPageHeight = pdf.internal.pageSize.getHeight();

        // Draw Title directly in jsPDF
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(16);
        pdf.setTextColor(40, 40, 40);
        pdf.text("Reporte de Inspección Horno de Cal L-2 - Arauco", 105, 15, { align: "center" });

        // Single Page Constraint Logic: 
        // Force the resulting image to fit inside the remaining A4 dimension
        const marginX = 10;
        const startY = 25; // Start drawing the canvas image below the title
        const marginYBottom = 10;

        const availableWidth = pdfPageWidth - (marginX * 2);
        const availableHeight = pdfPageHeight - startY - marginYBottom;

        let imgWidth = canvas.width;
        let imgHeight = canvas.height;

        let ratio = availableWidth / imgWidth;
        let scaledWidth = availableWidth;
        let scaledHeight = imgHeight * ratio;

        // If the scaled height still exceeds the available height, 
        // we must scale down based on the height limitation instead of width.
        if (scaledHeight > availableHeight) {
            ratio = availableHeight / imgHeight;
            scaledHeight = availableHeight;
            scaledWidth = imgWidth * ratio;
        }

        // Calculate X coordinate to perfectly center the image horizontally
        const xOffset = (pdfPageWidth - scaledWidth) / 2;

        // Draw the main dashboard exactly once, fitting completely on page 1
        pdf.addImage(imgData, 'JPEG', xOffset, startY, scaledWidth, scaledHeight);

        // Stabilize the Footer manually at the absolute bottom
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.setFont("helvetica", "italic");
        pdf.text("Created by Gilbert Retamal Silva", pdfPageWidth - marginX, pdfPageHeight - 8, { align: "right" });

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
