import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")
supabase = create_client(supabase_url, supabase_key)

app = Flask(__name__)
CORS(app, 
     resources={r"/*": {"origins": "*"}}, 
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allow_headers=["Content-Type", "Authorization"])

@app.route('/test', methods=['GET'])
def test():
    # Simple test endpoint that doesn't use jsonify
    return "Backend is running!"

@app.route('/hello', methods=['GET'])
def hello_alt():
    return jsonify({"message": "Welcome to Agora!"})

@app.route('/api/hello', methods=['GET'])
def hello():
    return jsonify({"message": "Welcome to Agora!"})

# Add Supabase-related routes
@app.route('/api/validate-token', methods=['POST'])
def validate_token():
    try:
        # Get the token from the request
        data = request.json
        token = data.get('token')
        
        if not token:
            return jsonify({"error": "No token provided"}), 400
            
        # Verify the token with Supabase
        response = supabase.auth.get_user(token)
        
        return jsonify({
            "valid": True,
            "user": {
                "id": response.user.id,
                "email": response.user.email
            }
        })
    except Exception as e:
        return jsonify({"error": str(e), "valid": False}), 401

@app.route('/api/categories', methods=['GET'])
def get_categories():
    try:
        response = supabase.table('categories').select('*').execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/papers', methods=['GET'])
def get_papers():
    try:
        response = supabase.table('papers').select('*').eq('status', 'published').execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/papers/<paper_id>', methods=['GET'])
def get_paper(paper_id):
    try:
        # Get paper details with category information
        paper_response = supabase.table('papers').select('*, categories(id, name)').eq('id', paper_id).single().execute()
        paper = paper_response.data
        
        if not paper:
            return jsonify({"error": "Paper not found"}), 404
        
        # Get authors
        authors_response = supabase.table('paper_authors')\
            .select('*, profiles(id, full_name, email)')\
            .eq('paper_id', paper_id)\
            .execute()
        authors = authors_response.data
        
        # Get figures
        figures_response = supabase.table('figures')\
            .select('*')\
            .eq('paper_id', paper_id)\
            .order('figure_order', ascending=True)\
            .execute()
        figures = figures_response.data
        
        return jsonify({
            "paper": paper,
            "authors": authors,
            "figures": figures
        })
    except Exception as e:
        print(f"Error fetching paper details: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Add these endpoints to your app.py file

@app.route('/api/papers', methods=['POST'])
def create_paper():
    try:
        # Get request data
        data = request.json
        
        # Validate required fields
        required_fields = ['title', 'abstract', 'category_id', 'pdf_url']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Insert paper into Supabase
        response = supabase.table('papers').insert({
            "title": data['title'],
            "abstract": data['abstract'],
            "category_id": data['category_id'],
            "status": "draft",
            "pdf_url": data['pdf_url']
        }).execute()
        
        if len(response.data) == 0:
            return jsonify({"error": "Failed to create paper"}), 500
            
        paper_id = response.data[0]['id']
        
        # Add author information
        author_data = {
            "paper_id": paper_id,
            "author_id": data['author_id'],
            "is_corresponding": True,
            "author_order": 1
        }
        
        author_response = supabase.table('paper_authors').insert(author_data).execute()
        
        # Handle co-authors if present
        if 'co_authors' in data and len(data['co_authors']) > 0:
            for co_author in data['co_authors']:
                # Lookup user by email
                user_response = supabase.table('profiles')\
                    .select('id')\
                    .eq('email', co_author['email'])\
                    .execute()
                
                if len(user_response.data) > 0:
                    co_author_id = user_response.data[0]['id']
                    supabase.table('paper_authors').insert({
                        "paper_id": paper_id,
                        "author_id": co_author_id,
                        "is_corresponding": False,
                        "author_order": co_author['order']
                    }).execute()
        
        return jsonify({"success": True, "paper_id": paper_id})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/user/papers', methods=['GET'])
def get_user_papers():
    try:
        # Get user ID from request
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({"error": "Missing user_id parameter"}), 400
            
        # Get papers where user is an author
        response = supabase.from_('paper_authors')\
            .select('paper_id, papers(id, title, abstract, status, submitted_at, updated_at)')\
            .eq('author_id', user_id)\
            .execute()
            
        papers = []
        for item in response.data:
            if item['papers']:
                papers.append({
                    'id': item['paper_id'],
                    **item['papers']
                })
                
        return jsonify(papers)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/categories/list', methods=['GET'])
def list_categories():
    try:
        response = supabase.table('categories').select('*').execute()
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Add these routes to your app.py file

@app.route('/api/reviews', methods=['POST'])
def create_review():
    """Create a new review for a paper"""
    try:
        # Get request data
        data = request.json
        
        # Validate required fields
        required_fields = ['paper_id', 'reviewer_id', 'content']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Insert review into Supabase
        response = supabase.table('reviews').insert({
            "paper_id": data['paper_id'],
            "reviewer_id": data['reviewer_id'],
            "content": data['content'],
            "status": data.get('status', 'submitted'),
            "rating": data.get('rating')
        }).execute()
        
        if len(response.data) == 0:
            return jsonify({"error": "Failed to create review"}), 500
            
        # Update review assignment status if it exists
        supabase.table('review_assignments')\
            .update({"status": "completed"})\
            .eq('paper_id', data['paper_id'])\
            .eq('reviewer_id', data['reviewer_id'])\
            .execute()
            
        return jsonify({"success": True, "review_id": response.data[0]['id']})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/papers/<paper_id>/reviews', methods=['GET'])
def get_paper_reviews(paper_id):
    """Get all reviews for a specific paper"""
    try:
        response = supabase.table('reviews')\
            .select('id, content, rating, status, created_at, reviewer_id, profiles(id, full_name)')\
            .eq('paper_id', paper_id)\
            .execute()
            
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/review-assignments', methods=['POST'])
def create_review_assignment():
    """Assign a reviewer to a paper"""
    try:
        # Get request data
        data = request.json
        
        # Validate required fields
        required_fields = ['paper_id', 'reviewer_id']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400
        
        # Check if assignment already exists
        existing = supabase.table('review_assignments')\
            .select('id')\
            .eq('paper_id', data['paper_id'])\
            .eq('reviewer_id', data['reviewer_id'])\
            .execute()
            
        if len(existing.data) > 0:
            return jsonify({"error": "Reviewer already assigned to this paper"}), 400
        
        # Insert assignment into Supabase
        response = supabase.table('review_assignments').insert({
            "paper_id": data['paper_id'],
            "reviewer_id": data['reviewer_id'],
            "status": data.get('status', 'assigned'),
            "assigned_at": data.get('assigned_at', datetime.now().isoformat())
        }).execute()
        
        if len(response.data) == 0:
            return jsonify({"error": "Failed to create assignment"}), 500
            
        # Update paper status if necessary
        paper_response = supabase.table('papers')\
            .select('status')\
            .eq('id', data['paper_id'])\
            .single()\
            .execute()
            
        if paper_response.data['status'] == 'submitted':
            supabase.table('papers')\
                .update({"status": "under_review"})\
                .eq('id', data['paper_id'])\
                .execute()
                
        return jsonify({"success": True, "assignment_id": response.data[0]['id']})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/review-assignments/<assignment_id>', methods=['DELETE'])
def delete_review_assignment(assignment_id):
    """Remove a reviewer assignment"""
    try:
        response = supabase.table('review_assignments')\
            .delete()\
            .eq('id', assignment_id)\
            .execute()
            
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/papers/<paper_id>/review-assignments', methods=['GET'])
def get_paper_review_assignments(paper_id):
    """Get all reviewer assignments for a specific paper"""
    try:
        response = supabase.table('review_assignments')\
            .select('id, reviewer_id, status, assigned_at, profiles(id, full_name, email)')\
            .eq('paper_id', paper_id)\
            .execute()
            
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/users/reviewers', methods=['GET'])
def get_potential_reviewers():
    """Get all users who can be assigned as reviewers (excluding given paper's authors)"""
    try:
        paper_id = request.args.get('paper_id')
        if not paper_id:
            return jsonify({"error": "Missing paper_id parameter"}), 400
            
        # Get author IDs to exclude
        author_response = supabase.table('paper_authors')\
            .select('author_id')\
            .eq('paper_id', paper_id)\
            .execute()
            
        author_ids = [author['author_id'] for author in author_response.data]
        
        # If no authors found (shouldn't happen), return empty list
        if not author_ids:
            return jsonify([])
            
        # Get all users except the authors
        user_response = supabase.from_('profiles')\
            .select('id, full_name, email, user_type')\
            .not_('id', 'in', f"({','.join(author_ids)})")\
            .order('full_name')\
            .execute()
            
        return jsonify(user_response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/papers/<paper_id>/status', methods=['PUT'])
def update_paper_status(paper_id):
    """Update the status of a paper"""
    try:
        data = request.json
        
        if 'status' not in data:
            return jsonify({"error": "Missing status parameter"}), 400
            
        valid_statuses = ['draft', 'submitted', 'under_review', 'published', 'rejected']
        if data['status'] not in valid_statuses:
            return jsonify({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400
            
        response = supabase.table('papers')\
            .update({"status": data['status']})\
            .eq('id', paper_id)\
            .execute()
            
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/user/review-assignments', methods=['GET'])
def get_user_review_assignments():
    """Get all paper assignments for the current reviewer"""
    try:
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({"error": "Missing user_id parameter"}), 400
            
        response = supabase.from_('review_assignments')\
            .select('''
                id,
                status,
                assigned_at,
                paper_id,
                papers(id, title, abstract, status, submitted_at)
            ''')\
            .eq('reviewer_id', user_id)\
            .execute()
            
        # Format the response data
        papers_to_review = []
        for item in response.data:
            if item['papers']:
                papers_to_review.append({
                    'assignment_id': item['id'],
                    'assignment_status': item['status'],
                    'assigned_at': item['assigned_at'],
                    'paper_id': item['paper_id'],
                    'paper_title': item['papers']['title'],
                    'paper_abstract': item['papers']['abstract'],
                    'paper_status': item['papers']['status'],
                    'paper_submitted_at': item['papers']['submitted_at']
                })
                
        return jsonify(papers_to_review)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting Agora backend server at http://0.0.0.0:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)