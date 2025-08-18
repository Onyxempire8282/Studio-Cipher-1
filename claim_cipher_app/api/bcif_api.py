#!/usr/bin/env python3
"""
BCIF Form Filling API
Uses the proven bcif_fill.py logic to fill PDF forms server-side
"""

import os
import json
import tempfile
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import base64

# Import the proven bcif_fill logic
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import functions from bcif_fill.py
from bcif_fill import apply_text_mapping, apply_post_processing, collect_checkbox_states, fill_pdf

app = Flask(__name__)
CORS(app)  # Enable CORS for browser requests

# Configuration
UPLOAD_FOLDER = Path(tempfile.gettempdir()) / 'bcif_uploads'
UPLOAD_FOLDER.mkdir(exist_ok=True)

@app.route('/health', methods=['GET'])
def health_check():
    """Simple health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'BCIF API is running',
        'version': '1.0.0'
    })

@app.route('/fill-bcif', methods=['POST'])
def fill_bcif_form():
    """
    Fill BCIF form using extracted text data
    
    Expected JSON payload:
    {
        "extracted_text": "full text from CCC PDF",
        "template_name": "Fillable_CCC_BCIF.pdf" (optional)
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'extracted_text' not in data:
            return jsonify({
                'error': 'Missing extracted_text in request'
            }), 400
        
        extracted_text = data['extracted_text']
        template_name = data.get('template_name', 'Fillable_CCC_BCIF.pdf')
        
        # Load the mapping configuration
        mapping_path = Path(__file__).parent.parent / 'config' / 'bcif-mapping.json'
        
        if not mapping_path.exists():
            return jsonify({
                'error': f'Mapping configuration not found: {mapping_path}'
            }), 500
        
        with open(mapping_path, 'r') as f:
            mapping_spec = json.load(f)
        
        # Load the PDF template
        template_path = Path(__file__).parent.parent / 'forms' / template_name
        
        if not template_path.exists():
            return jsonify({
                'error': f'PDF template not found: {template_path}'
            }), 500
        
        # Apply the proven bcif_fill.py logic
        print(f"Processing text extraction with {len(extracted_text)} characters")
        print(f"First 500 chars: {extracted_text[:500]}")
        
        # Extract text fields using patterns
        text_fields = apply_text_mapping(extracted_text, mapping_spec.get("text_fields", {}))
        print(f"Extracted {len(text_fields)} text fields: {list(text_fields.keys())}")
        print(f"Field values: {text_fields}")
        
        # Apply post-processing
        apply_post_processing(text_fields, mapping_spec.get("post_processing", {}))
        
        # Extract checkbox states
        checkbox_fields = collect_checkbox_states(extracted_text, mapping_spec.get("checkbox_rules", {}))
        print(f"Found {len(checkbox_fields)} checkbox options: {checkbox_fields}")
        
        # Create temporary output file
        output_path = UPLOAD_FOLDER / f'filled_bcif_{os.urandom(8).hex()}.pdf'
        
        # Fill the PDF using the proven logic
        fill_pdf(template_path, text_fields, checkbox_fields, output_path)
        
        print(f"BCIF form filled successfully: {output_path}")
        
        # Return the filled PDF
        return send_file(
            output_path,
            as_attachment=True,
            download_name=f'CCC_BCIF_{text_fields.get("Claim Number", "FILLED")}.pdf',
            mimetype='application/pdf'
        )
        
    except Exception as e:
        print(f"Error filling BCIF form: {str(e)}")
        return jsonify({
            'error': f'Form filling failed: {str(e)}'
        }), 500

@app.route('/extract-and-fill', methods=['POST'])
def extract_and_fill():
    """
    Complete workflow: extract from uploaded PDF and fill BCIF form
    
    Expected form data:
    - pdf_file: The CCC estimate PDF file
    - template_name: BCIF template name (optional)
    """
    try:
        if 'pdf_file' not in request.files:
            return jsonify({'error': 'No PDF file uploaded'}), 400
        
        pdf_file = request.files['pdf_file']
        template_name = request.form.get('template_name', 'Fillable_CCC_BCIF.pdf')
        
        if pdf_file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save uploaded file temporarily
        upload_path = UPLOAD_FOLDER / f'upload_{os.urandom(8).hex()}.pdf'
        pdf_file.save(upload_path)
        
        # Extract text from uploaded PDF
        from bcif_fill import extract_text
        extracted_text = extract_text(upload_path)
        
        print(f"Extracted {len(extracted_text)} characters from uploaded PDF")
        
        # Clean up uploaded file
        upload_path.unlink()
        
        # Process with the fill logic (reuse the logic from fill_bcif_form)
        mapping_path = Path(__file__).parent.parent / 'config' / 'bcif-mapping.json'
        with open(mapping_path, 'r') as f:
            mapping_spec = json.load(f)
        
        # Apply extraction and filling
        text_fields = apply_text_mapping(extracted_text, mapping_spec.get("text_fields", {}))
        apply_post_processing(text_fields, mapping_spec.get("post_processing", {}))
        checkbox_fields = collect_checkbox_states(extracted_text, mapping_spec.get("checkbox_rules", {}))
        
        # Fill the form
        template_path = Path(__file__).parent.parent / 'forms' / template_name
        output_path = UPLOAD_FOLDER / f'filled_bcif_{os.urandom(8).hex()}.pdf'
        
        fill_pdf(template_path, text_fields, checkbox_fields, output_path)
        
        print(f"Complete workflow succeeded: {output_path}")
        
        return send_file(
            output_path,
            as_attachment=True,
            download_name=f'CCC_BCIF_{text_fields.get("Claim Number", "FILLED")}.pdf',
            mimetype='application/pdf'
        )
        
    except Exception as e:
        print(f"Extract and fill failed: {str(e)}")
        return jsonify({
            'error': f'Extract and fill failed: {str(e)}'
        }), 500

@app.route('/debug-extraction', methods=['POST'])
def debug_extraction():
    """
    Debug endpoint to see what gets extracted without filling the form
    """
    try:
        data = request.get_json()
        extracted_text = data.get('extracted_text', '')
        
        # Load mapping
        mapping_path = Path(__file__).parent.parent / 'config' / 'bcif-mapping.json'
        with open(mapping_path, 'r') as f:
            mapping_spec = json.load(f)
        
        # Extract fields
        text_fields = apply_text_mapping(extracted_text, mapping_spec.get("text_fields", {}))
        apply_post_processing(text_fields, mapping_spec.get("post_processing", {}))
        checkbox_fields = collect_checkbox_states(extracted_text, mapping_spec.get("checkbox_rules", {}))
        
        return jsonify({
            'text_fields': text_fields,
            'checkbox_fields': checkbox_fields,
            'field_count': len(text_fields),
            'checkbox_count': len(checkbox_fields)
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Cleanup old files on startup
def cleanup_old_files():
    """Remove old temporary files"""
    try:
        for file_path in UPLOAD_FOLDER.glob('*.pdf'):
            if file_path.stat().st_mtime < (time.time() - 3600):  # 1 hour old
                file_path.unlink()
    except Exception:
        pass

if __name__ == '__main__':
    import time
    cleanup_old_files()
    
    print("Starting BCIF API server...")
    print(f"Upload folder: {UPLOAD_FOLDER}")
    print(f"Template path: {Path(__file__).parent.parent / 'forms'}")
    print(f"Config path: {Path(__file__).parent.parent / 'config'}")
    
    app.run(debug=True, host='0.0.0.0', port=5000)