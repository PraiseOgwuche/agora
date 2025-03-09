import os
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
from supabase import create_client
from datetime import datetime, timedelta

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
        
        # Check if reviewer is an author of the paper
        author_check = supabase.table('paper_authors')\
            .select('id')\
            .eq('paper_id', data['paper_id'])\
            .eq('author_id', data['reviewer_id'])\
            .execute()
            
        if len(author_check.data) > 0:
            return jsonify({"error": "Cannot assign an author as a reviewer of their own paper"}), 400
        
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
            
        if paper_response.data['status'] in ['submitted', 'draft']:
            supabase.table('papers')\
                .update({"status": "under_review"})\
                .eq('id', data['paper_id'])\
                .execute()
                
        return jsonify({
            "success": True, 
            "assignment_id": response.data[0]['id'],
            "message": "Reviewer assigned successfully"
        })
    except Exception as e:
        print(f"Error in review assignment: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/review-assignments/batch', methods=['POST'])
def create_batch_review_assignments():
    """Assign multiple reviewers to a paper at once"""
    try:
        # Get request data
        data = request.json
        
        # Validate required fields
        if 'paper_id' not in data or 'reviewer_ids' not in data or not data['reviewer_ids']:
            return jsonify({"error": "Missing paper_id or reviewer_ids"}), 400
            
        paper_id = data['paper_id']
        reviewer_ids = data['reviewer_ids']
        
        # Get existing assignments to avoid duplicates
        existing = supabase.table('review_assignments')\
            .select('reviewer_id')\
            .eq('paper_id', paper_id)\
            .execute()
            
        existing_reviewer_ids = [item['reviewer_id'] for item in existing.data]
        
        # Get author IDs to prevent assigning authors as reviewers
        authors = supabase.table('paper_authors')\
            .select('author_id')\
            .eq('paper_id', paper_id)\
            .execute()
            
        author_ids = [item['author_id'] for item in authors.data]
        
        # Filter out existing reviewers and authors
        valid_reviewer_ids = [
            reviewer_id for reviewer_id in reviewer_ids 
            if reviewer_id not in existing_reviewer_ids and reviewer_id not in author_ids
        ]
        
        if not valid_reviewer_ids:
            return jsonify({"error": "No valid reviewers to assign"}), 400
        
        # Create assignments
        assignments = [{
            "paper_id": paper_id,
            "reviewer_id": reviewer_id,
            "status": "assigned",
            "assigned_at": datetime.now().isoformat()
        } for reviewer_id in valid_reviewer_ids]
        
        response = supabase.table('review_assignments').insert(assignments).execute()
        
        if len(response.data) == 0:
            return jsonify({"error": "Failed to create assignments"}), 500
        
        # Update paper status if necessary
        paper_response = supabase.table('papers')\
            .select('status')\
            .eq('id', paper_id)\
            .single()\
            .execute()
            
        if paper_response.data['status'] in ['submitted', 'draft']:
            supabase.table('papers')\
                .update({"status": "under_review"})\
                .eq('id', paper_id)\
                .execute()
        
        return jsonify({
            "success": True,
            "assigned_count": len(response.data),
            "message": f"Successfully assigned {len(response.data)} reviewers"
        })
    except Exception as e:
        print(f"Error in batch review assignment: {str(e)}")
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
    """Update the status of a paper with validation and notifications"""
    try:
        data = request.json
        
        if 'status' not in data:
            return jsonify({"error": "Missing status parameter"}), 400
            
        new_status = data['status']
        valid_statuses = ['draft', 'submitted', 'under_review', 'published', 'rejected']
        
        if new_status not in valid_statuses:
            return jsonify({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400
        
        # Get current paper status
        paper_response = supabase.table('papers')\
            .select('status, title')\
            .eq('id', paper_id)\
            .single()\
            .execute()
            
        if not paper_response.data:
            return jsonify({"error": "Paper not found"}), 404
            
        current_status = paper_response.data['status']
        paper_title = paper_response.data['title']
        
        # Validate status transition
        valid_transitions = {
            'draft': ['submitted'],
            'submitted': ['under_review', 'rejected'],
            'under_review': ['published', 'rejected'],
            'published': ['retracted'],
            'rejected': ['draft'],
            'retracted': []
        }
        
        if new_status not in valid_transitions.get(current_status, []):
            return jsonify({
                "error": f"Invalid status transition from '{current_status}' to '{new_status}'."
            }), 400
        
        # Update paper status
        response = supabase.table('papers')\
            .update({"status": new_status})\
            .eq('id', paper_id)\
            .execute()
        
        # Get paper authors for notification
        authors_response = supabase.table('paper_authors')\
            .select('author_id, profiles(email, full_name)')\
            .eq('paper_id', paper_id)\
            .execute()
        
        # Create status change notification in the database
        status_message = get_status_change_message(current_status, new_status, paper_title)
        
        for author in authors_response.data:
            supabase.table('notifications').insert({
                "user_id": author['author_id'],
                "message": status_message,
                "type": "paper_status",
                "related_id": paper_id,
                "read": False,
                "created_at": datetime.now().isoformat()
            }).execute()
        
        return jsonify({
            "success": True,
            "previous_status": current_status,
            "new_status": new_status
        })
    except Exception as e:
        print(f"Error updating paper status: {str(e)}")
        return jsonify({"error": str(e)}), 500

def get_status_change_message(old_status, new_status, paper_title):
    """Generate appropriate notification message for status changes"""
    status_messages = {
        ('draft', 'submitted'): f"Your paper '{paper_title}' has been submitted for review.",
        ('submitted', 'under_review'): f"Your paper '{paper_title}' is now under review.",
        ('under_review', 'published'): f"Congratulations! Your paper '{paper_title}' has been accepted and published.",
        ('under_review', 'rejected'): f"Your paper '{paper_title}' was not accepted for publication.",
        ('rejected', 'draft'): f"Your paper '{paper_title}' has been moved back to draft status.",
        ('published', 'retracted'): f"Your paper '{paper_title}' has been retracted."
    }
    
    return status_messages.get((old_status, new_status), f"The status of your paper '{paper_title}' has changed from {old_status} to {new_status}.")

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

# Add these routes to your app.py file

# Paper Likes API
@app.route('/api/papers/<paper_id>/likes', methods=['GET'])
def get_paper_likes(paper_id):
    """Get likes for a specific paper"""
    try:
        # Get like count
        count_response = supabase.table('paper_likes')\
            .select('id', 'count')\
            .eq('paper_id', paper_id)\
            .execute()
            
        like_count = count_response.count
        
        # Check if current user liked the paper
        current_user = request.args.get('user_id')
        user_liked = False
        
        if current_user:
            user_response = supabase.table('paper_likes')\
                .select('id')\
                .eq('paper_id', paper_id)\
                .eq('user_id', current_user)\
                .execute()
                
            user_liked = len(user_response.data) > 0
        
        return jsonify({
            "count": like_count,
            "user_liked": user_liked
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/papers/<paper_id>/likes', methods=['POST'])
def toggle_paper_like(paper_id):
    """Toggle like status for a paper"""
    try:
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400
        
        # Check if like already exists
        existing_query = (
            supabase.table('paper_likes')
            .select('id')
            .eq('paper_id', paper_id)
            .eq('user_id', user_id)
        )
        
        existing = existing_query.execute()
        
        if existing.data and len(existing.data) > 0:
            # Unlike: Remove the like
            delete_query = (
                supabase.table('paper_likes')
                .delete()
                .eq('paper_id', paper_id)
                .eq('user_id', user_id)
            )
            
            delete_query.execute()
            return jsonify({"liked": False})
        else:
            # Like: Add a new like
            insert_query = (
                supabase.table('paper_likes')
                .insert({"paper_id": paper_id, "user_id": user_id})
            )
            
            insert_query.execute()
            
            # Get paper details
            paper_query = (
                supabase.table('papers')
                .select('title')
                .eq('id', paper_id)
                .single()
            )
            
            paper = paper_query.execute()
            
            # Get paper authors to notify them
            authors_query = (
                supabase.table('paper_authors')
                .select('author_id')
                .eq('paper_id', paper_id)
            )
            
            authors = authors_query.execute()
            
            # Get user's name
            user_profile_query = (
                supabase.table('profiles')
                .select('full_name')
                .eq('id', user_id)
                .single()
            )
            
            user_profile = user_profile_query.execute()
            
            # Create notifications for authors (except the user who liked)
            if paper.data and user_profile.data:
                paper_title = paper.data['title']
                liker_name = user_profile.data['full_name']
                
                for author in authors.data:
                    author_id = author['author_id']
                    
                    # Don't notify yourself if you like your own paper
                    if author_id != user_id:
                        notification = {
                            "user_id": author_id,
                            "related_id": paper_id,
                            "type": "like",
                            "message": f"{liker_name} liked your paper '{paper_title}'",
                            "read": False
                        }
                        
                        supabase.table('notifications').insert(notification).execute()
            
            return jsonify({"liked": True})
    except Exception as e:
        print(f"Error toggling like: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Paper Comments API
@app.route('/api/papers/<paper_id>/comments', methods=['GET'])
def get_paper_comments(paper_id):
    """Get comments for a specific paper"""
    try:
        response = supabase.table('paper_comments')\
            .select('*, profiles(id, full_name)')\
            .eq('paper_id', paper_id)\
            .order('created_at')\
            .execute()
            
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/papers/<paper_id>/comments', methods=['POST'])
def add_paper_comment(paper_id):
    """Add a comment to a paper"""
    try:
        data = request.json
        
        if not data.get('content') or not data.get('user_id'):
            return jsonify({"error": "Content and user_id are required"}), 400
        
        comment_data = {
            "paper_id": paper_id,
            "user_id": data['user_id'],
            "content": data['content'],
            "parent_id": data.get('parent_id')  # Optional, for threaded comments
        }
        
        comment_query = (
            supabase.table('paper_comments')
            .insert(comment_data)
        )
        
        response = comment_query.execute()
            
        if not response.data or len(response.data) == 0:
            return jsonify({"error": "Failed to create comment"}), 500
            
        # Get the newly created comment with user info
        new_comment_query = (
            supabase.table('paper_comments')
            .select('*, profiles(id, full_name)')
            .eq('id', response.data[0]['id'])
            .single()
        )
        
        new_comment = new_comment_query.execute()
        
        # Create notifications for paper authors
        paper_query = (
            supabase.table('papers')
            .select('title')
            .eq('id', paper_id)
            .single()
        )
        
        paper = paper_query.execute()
        
        authors_query = (
            supabase.table('paper_authors')
            .select('author_id')
            .eq('paper_id', paper_id)
        )
        
        authors = authors_query.execute()
        
        if paper.data and new_comment.data:
            paper_title = paper.data['title']
            commenter_name = new_comment.data['profiles']['full_name']
            commenter_id = data['user_id']
            
            for author in authors.data:
                author_id = author['author_id']
                
                # Don't notify yourself
                if author_id != commenter_id:
                    notification = {
                        "user_id": author_id,
                        "related_id": paper_id,
                        "type": "comment",
                        "message": f"{commenter_name} commented on your paper '{paper_title}'",
                        "read": False
                    }
                    
                    supabase.table('notifications').insert(notification).execute()
            
        return jsonify(new_comment.data)
    except Exception as e:
        print(f"Error adding comment: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/comments/<comment_id>', methods=['PUT'])
def update_comment(comment_id):
    """Update a comment"""
    try:
        data = request.json
        
        if not data.get('content'):
            return jsonify({"error": "Content is required"}), 400
        
        response = supabase.table('paper_comments')\
            .update({"content": data['content']})\
            .eq('id', comment_id)\
            .execute()
            
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/comments/<comment_id>', methods=['DELETE'])
def delete_comment(comment_id):
    """Delete a comment"""
    try:
        response = supabase.table('paper_comments')\
            .delete()\
            .eq('id', comment_id)\
            .execute()
            
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Paper Feedback API
@app.route('/api/papers/<paper_id>/feedback', methods=['GET'])
def get_paper_feedback(paper_id):
    """Get feedback for a specific paper"""
    try:
        # Check if user is an author
        user_id = request.args.get('user_id')
        is_author = False
        
        if user_id:
            author_check = supabase.table('paper_authors')\
                .select('id')\
                .eq('paper_id', paper_id)\
                .eq('author_id', user_id)\
                .execute()
                
            is_author = len(author_check.data) > 0
        
        # Build the query based on user's role
        if is_author:
            # Authors can see all feedback
            response = supabase.table('paper_feedback')\
                .select('*, profiles(id, full_name)')\
                .eq('paper_id', paper_id)\
                .order('created_at', {'ascending': False})\
                .execute()
        else:
            # Non-authors can only see public feedback
            response = supabase.table('paper_feedback')\
                .select('*, profiles(id, full_name)')\
                .eq('paper_id', paper_id)\
                .eq('is_private', False)\
                .order('created_at', {'ascending': False})\
                .execute()
                
        return jsonify(response.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/papers/<paper_id>/feedback', methods=['POST'])
def add_paper_feedback(paper_id):
    """Add feedback to a paper"""
    try:
        data = request.json
        
        if not data.get('content') or not data.get('user_id'):
            return jsonify({"error": "Content and user_id are required"}), 400
        
        feedback_data = {
            "paper_id": paper_id,
            "user_id": data['user_id'],
            "content": data['content'],
            "is_private": data.get('is_private', False)
        }
        
        feedback_query = (
            supabase.table('paper_feedback')
            .insert(feedback_data)
        )
        
        response = feedback_query.execute()
            
        if not response.data or len(response.data) == 0:
            return jsonify({"error": "Failed to create feedback"}), 500
            
        # Get the newly created feedback with user info
        new_feedback_query = (
            supabase.table('paper_feedback')
            .select('*, profiles(id, full_name)')
            .eq('id', response.data[0]['id'])
            .single()
        )
        
        new_feedback = new_feedback_query.execute()
        
        # Create notifications for paper authors
        paper_query = (
            supabase.table('papers')
            .select('title')
            .eq('id', paper_id)
            .single()
        )
        
        paper = paper_query.execute()
        
        authors_query = (
            supabase.table('paper_authors')
            .select('author_id')
            .eq('paper_id', paper_id)
        )
        
        authors = authors_query.execute()
        
        if paper.data and new_feedback.data:
            paper_title = paper.data['title']
            feedback_provider_name = new_feedback.data['profiles']['full_name']
            feedback_provider_id = data['user_id']
            
            for author in authors.data:
                author_id = author['author_id']
                
                # Don't notify yourself
                if author_id != feedback_provider_id:
                    notification = {
                        "user_id": author_id,
                        "related_id": paper_id,
                        "type": "feedback",
                        "message": f"{feedback_provider_name} provided feedback on your paper '{paper_title}'",
                        "read": False
                    }
                    
                    supabase.table('notifications').insert(notification).execute()
            
        return jsonify(new_feedback.data)
    except Exception as e:
        print(f"Error adding feedback: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/papers/<paper_id>/view', methods=['POST'])
def log_paper_view(paper_id):
    """Log a paper view for analytics"""
    try:
        data = request.json
        user_id = data.get('user_id')  # This can be null for anonymous views
        
        # Optional: Check for recent views from same user/IP to prevent duplicate counting
        if user_id:
            # Check if user already viewed this paper in the last hour
            recent_view = supabase.table('paper_views')\
                .select('id')\
                .eq('paper_id', paper_id)\
                .eq('user_id', user_id)\
                .gte('viewed_at', (datetime.now() - timedelta(hours=1)).isoformat())\
                .execute()
                
            if recent_view.data and len(recent_view.data) > 0:
                # Already counted a recent view, don't count again
                return jsonify({"success": True, "counted": False})
        
        # Log the view
        view_data = {
            "paper_id": paper_id,
            "user_id": user_id,
            "viewed_at": datetime.now().isoformat()
        }
        
        # Add IP address if you want to track it (consider privacy implications)
        if request.remote_addr:
            view_data["ip_address"] = request.remote_addr
            
        # Add user agent if you want to track it
        if request.headers.get('User-Agent'):
            view_data["user_agent"] = request.headers.get('User-Agent')
        
        response = supabase.table('paper_views')\
            .insert(view_data)\
            .execute()
            
        return jsonify({"success": True, "counted": True})
    except Exception as e:
        print(f"Error logging paper view: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/trending-papers', methods=['GET'])
def get_trending_papers():
    """Get trending papers based on views and other engagement metrics"""
    try:
        # Get query parameters
        time_period = int(request.args.get('time_period', 30))  # Default 30 days
        category = request.args.get('category')  # Optional category filter
        limit = int(request.args.get('limit', 10))  # Default 10 papers
        
        # Call the RPC function we created in the database
        response = supabase.rpc(
            'get_trending_papers',
            {
                'time_period_days': time_period,
                'category_filter': category,
                'limit_count': limit
            }
        ).execute()
        
        if response.data is None:
            return jsonify([])
            
        return jsonify(response.data)
    except Exception as e:
        print(f"Error fetching trending papers: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/papers/<paper_id>/stats', methods=['GET'])
def get_paper_stats(paper_id):
    """Get engagement statistics for a specific paper"""
    try:
        # Set time period for stats (default 30 days)
        time_period = int(request.args.get('time_period', 30))
        cutoff_date = (datetime.now() - timedelta(days=time_period)).isoformat()
        
        # Get view count
        view_response = supabase.table('paper_views')\
            .select('id', 'count')\
            .eq('paper_id', paper_id)\
            .gte('viewed_at', cutoff_date)\
            .execute()
            
        view_count = view_response.count
        
        # Get like count
        like_response = supabase.table('paper_likes')\
            .select('id', 'count')\
            .eq('paper_id', paper_id)\
            .execute()
            
        like_count = like_response.count
        
        # Get comment count
        comment_response = supabase.table('paper_comments')\
            .select('id', 'count')\
            .eq('paper_id', paper_id)\
            .execute()
            
        comment_count = comment_response.count
        
        # Get feedback count
        feedback_response = supabase.table('paper_feedback')\
            .select('id', 'count')\
            .eq('paper_id', paper_id)\
            .execute()
            
        feedback_count = feedback_response.count
        
        return jsonify({
            "view_count": view_count,
            "like_count": like_count,
            "comment_count": comment_count,
            "feedback_count": feedback_count,
            "time_period_days": time_period
        })
    except Exception as e:
        print(f"Error fetching paper stats: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Add these endpoints to your app.py file

@app.route('/api/papers/<paper_id>/shared-links', methods=['GET'])
def get_paper_shared_links(paper_id):
    """Get all shared links for a specific paper"""
    try:
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400
            
        # Check if user is an author or staff
        is_author = supabase.table('paper_authors')\
            .select('id')\
            .eq('paper_id', paper_id)\
            .eq('author_id', user_id)\
            .execute()
            
        user_profile = supabase.table('profiles')\
            .select('user_type')\
            .eq('id', user_id)\
            .single()\
            .execute()
            
        is_staff = user_profile.data and user_profile.data.get('user_type') == 'staff'
        
        if not (is_author.data or is_staff):
            return jsonify({"error": "Unauthorized access"}), 403
            
        # Get all shared links for the paper
        response = supabase.table('paper_shared_links')\
            .select('*')\
            .eq('paper_id', paper_id)\
            .order('created_at', {'ascending': False})\
            .execute()
            
        return jsonify(response.data)
    except Exception as e:
        print(f"Error getting shared links: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/papers/<paper_id>/shared-links', methods=['POST'])
def create_paper_shared_link(paper_id):
    """Create a new shared link for a paper"""
    try:
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400
            
        # Check if paper exists and is published
        paper_response = supabase.table('papers')\
            .select('status')\
            .eq('id', paper_id)\
            .single()\
            .execute()
            
        if not paper_response.data:
            return jsonify({"error": "Paper not found"}), 404
            
        if paper_response.data['status'] != 'published':
            return jsonify({"error": "Only published papers can be shared"}), 400
            
        # Check if user is an author or staff
        is_author = supabase.table('paper_authors')\
            .select('id')\
            .eq('paper_id', paper_id)\
            .eq('author_id', user_id)\
            .execute()
            
        user_profile = supabase.table('profiles')\
            .select('user_type')\
            .eq('id', user_id)\
            .single()\
            .execute()
            
        is_staff = user_profile.data and user_profile.data.get('user_type') == 'staff'
        
        if not (is_author.data or is_staff):
            return jsonify({"error": "Only authors or staff can create shared links"}), 403
        
        # Generate a unique access key using the database function
        access_key_response = supabase.rpc('generate_access_key').execute()
        access_key = access_key_response.data
        
        # Set expiration date if provided
        expires_at = None
        if data.get('expires_days'):
            expires_at = (datetime.now() + timedelta(days=int(data.get('expires_days')))).isoformat()
            
        # Create the shared link
        link_data = {
            "paper_id": paper_id,
            "created_by": user_id,
            "access_key": access_key,
            "expires_at": expires_at,
            "allow_comments": data.get('allow_comments', False),
            "allow_download": data.get('allow_download', True)
        }
        
        response = supabase.table('paper_shared_links')\
            .insert(link_data)\
            .execute()
            
        if not response.data:
            return jsonify({"error": "Failed to create shared link"}), 500
            
        return jsonify({
            "success": True,
            "shared_link": response.data[0],
            "share_url": f"{request.host_url}shared/{access_key}"
        })
    except Exception as e:
        print(f"Error creating shared link: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/shared-links/<access_key>', methods=['GET'])
def get_shared_link_details(access_key):
    """Get details of a shared link without authentication"""
    try:
        # Get the shared link
        query = (
            supabase.table('paper_shared_links')
            .select('*')
            .eq('access_key', access_key)
            .single()
        )
        
        link_response = query.execute()
            
        print(f"Shared link response: {link_response}")  # For debugging
            
        if not link_response.data:
            return jsonify({"error": "Shared link not found"}), 404
            
        shared_link = link_response.data
        
        # Check if the link is active
        if not shared_link['is_active']:
            return jsonify({"error": "This shared link has been deactivated"}), 403
            
        # Check if the link has expired
        if shared_link['expires_at'] and datetime.datetime.fromisoformat(shared_link['expires_at'].replace('Z', '+00:00')) < datetime.datetime.now(datetime.timezone.utc):
            return jsonify({"error": "This shared link has expired"}), 403
            
        # Get the paper details
        paper_query = (
            supabase.table('papers')
            .select('id, title, abstract, status, created_at, updated_at, category_id, categories(name)')
            .eq('id', shared_link['paper_id'])
            .single()
        )
        
        paper_response = paper_query.execute()
            
        if not paper_response.data:
            return jsonify({"error": "Paper not found"}), 404
            
        paper = paper_response.data
        
        # Get the authors
        authors_query = (
            supabase.table('paper_authors')
            .select('profiles(full_name)')
            .eq('paper_id', shared_link['paper_id'])
        )
        
        authors_response = authors_query.execute()
            
        authors = [author['profiles']['full_name'] for author in authors_response.data] if authors_response.data else []
        
        # Increment view count and update last viewed time
        update_query = (
            supabase.table('paper_shared_links')
            .update({
                "view_count": shared_link['view_count'] + 1,
                "last_viewed_at": datetime.datetime.now().isoformat()
            })
            .eq('id', shared_link['id'])
        )
        
        update_query.execute()
            
        # Return the paper details along with sharing permissions
        return jsonify({
            "paper": {
                "id": paper['id'],
                "title": paper['title'],
                "abstract": paper['abstract'],
                "status": paper['status'],
                "created_at": paper['created_at'],
                "updated_at": paper['updated_at'],
                "category": paper['categories']['name'] if paper['categories'] else None,
                "authors": authors,
                "pdf_url": paper.get('pdf_url')  # Make sure to include PDF URL
            },
            "sharing": {
                "allow_comments": shared_link['allow_comments'],
                "allow_download": shared_link['allow_download'],
                "access_key": access_key,
                "expires_at": shared_link['expires_at']
            }
        })
    except Exception as e:
        print(f"Error getting shared link details: {str(e)}")  # For debugging
        return jsonify({"error": str(e)}), 500

@app.route('/api/shared-links/<access_key>/pdf', methods=['GET'])
def get_shared_paper_pdf(access_key):
    """Get the PDF for a shared paper"""
    try:
        # Get the shared link
        link_response = supabase.table('paper_shared_links')\
            .select('*, papers(pdf_url)')\
            .eq('access_key', access_key)\
            .single()\
            .execute()
            
        if not link_response.data:
            return jsonify({"error": "Shared link not found"}), 404
            
        shared_link = link_response.data
        
        # Check if the link is active
        if not shared_link['is_active']:
            return jsonify({"error": "This shared link has been deactivated"}), 403
            
        # Check if the link has expired
        if shared_link['expires_at'] and datetime.fromisoformat(shared_link['expires_at'].replace('Z', '+00:00')) < datetime.now(timezone.utc):
            return jsonify({"error": "This shared link has expired"}), 403
            
        # Check if downloads are allowed
        if not shared_link['allow_download']:
            return jsonify({"error": "Downloads are not allowed for this shared link"}), 403
            
        # Get the PDF URL
        pdf_url = shared_link['papers']['pdf_url']
        if not pdf_url:
            return jsonify({"error": "PDF not found"}), 404
            
        # Extract the filename from the PDF URL
        filename = pdf_url.split('/').pop()
        
        # Get a signed URL for the PDF
        signed_url_response = (
            supabase.storage
            .from_('papers')
            .create_signed_url(filename, 60)  # URL valid for 60 seconds
        )  
        if signed_url_response.error:
            return jsonify({"error": "Failed to generate PDF download link"}), 500
            
        # Return the signed URL
        return jsonify({
            "pdf_url": signed_url_response.data['signedUrl']
        })
    except Exception as e:
        print(f"Error getting shared paper PDF: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/shared-links/<link_id>', methods=['PUT'])
def update_shared_link(link_id):
    """Update a shared link's settings"""
    try:
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400
            
        # Check if user has permission to update this link
        link_response = supabase.table('paper_shared_links')\
            .select('created_by, paper_id')\
            .eq('id', link_id)\
            .single()\
            .execute()
            
        if not link_response.data:
            return jsonify({"error": "Shared link not found"}), 404
            
        link = link_response.data
        
        # Check if user is the creator, an author, or staff
        if link['created_by'] != user_id:
            # Check if user is an author
            is_author = supabase.table('paper_authors')\
                .select('id')\
                .eq('paper_id', link['paper_id'])\
                .eq('author_id', user_id)\
                .execute()
                
            # Check if user is staff
            user_profile = supabase.table('profiles')\
                .select('user_type')\
                .eq('id', user_id)\
                .single()\
                .execute()
                
            is_staff = user_profile.data and user_profile.data.get('user_type') == 'staff'
            
            if not (is_author.data or is_staff):
                return jsonify({"error": "Unauthorized to update this shared link"}), 403
        
        # Prepare update data
        update_data = {}
        
        if 'is_active' in data:
            update_data['is_active'] = data['is_active']
            
        if 'allow_comments' in data:
            update_data['allow_comments'] = data['allow_comments']
            
        if 'allow_download' in data:
            update_data['allow_download'] = data['allow_download']
            
        if 'expires_days' in data:
            # Calculate new expiration date
            expires_at = None
            if data['expires_days']:
                expires_at = (datetime.now() + timedelta(days=int(data['expires_days']))).isoformat()
            update_data['expires_at'] = expires_at
        
        # Update the shared link
        if update_data:
            response = supabase.table('paper_shared_links')\
                .update(update_data)\
                .eq('id', link_id)\
                .execute()
                
            if not response.data:
                return jsonify({"error": "Failed to update shared link"}), 500
                
            return jsonify({
                "success": True,
                "shared_link": response.data[0]
            })
        else:
            return jsonify({"error": "No update data provided"}), 400
    except Exception as e:
        print(f"Error updating shared link: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/shared-links/<link_id>', methods=['DELETE'])
def delete_shared_link(link_id):
    """Delete a shared link"""
    try:
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400
            
        # Check if user has permission to delete this link
        link_response = supabase.table('paper_shared_links')\
            .select('created_by, paper_id')\
            .eq('id', link_id)\
            .single()\
            .execute()
            
        if not link_response.data:
            return jsonify({"error": "Shared link not found"}), 404
            
        link = link_response.data
        
        # Check if user is the creator, an author, or staff
        if link['created_by'] != user_id:
            # Check if user is an author
            is_author = supabase.table('paper_authors')\
                .select('id')\
                .eq('paper_id', link['paper_id'])\
                .eq('author_id', user_id)\
                .execute()
                
            # Check if user is staff
            user_profile = supabase.table('profiles')\
                .select('user_type')\
                .eq('id', user_id)\
                .single()\
                .execute()
                
            is_staff = user_profile.data and user_profile.data.get('user_type') == 'staff'
            
            if not (is_author.data or is_staff):
                return jsonify({"error": "Unauthorized to delete this shared link"}), 403
        
        # Delete the shared link
        response = supabase.table('paper_shared_links')\
            .delete()\
            .eq('id', link_id)\
            .execute()
            
        return jsonify({"success": True})
    except Exception as e:
        print(f"Error deleting shared link: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/papers/by-category/<category_id>', methods=['GET'])
def get_papers_by_category(category_id):
    try:
        user_id = request.args.get('user_id')
        
        query = (
            supabase.table('papers')
            .select('*, categories(id, name)')
            .eq('category_id', category_id)
        )
        
        # Apply visibility filters based on user role
        if not user_id:
            # Not logged in - only published papers
            query = query.eq('status', 'published')
        else:
            # Check if user is staff
            user_profile = supabase.table('profiles').select('user_type').eq('id', user_id).single().execute()
            is_staff = user_profile.data and user_profile.data.get('user_type') == 'staff'
            
            if is_staff:
                # Staff can see all papers - no additional filtering
                pass
            else:
                # Regular user - published papers + own drafts
                authored_papers = supabase.table('paper_authors').select('paper_id').eq('author_id', user_id).execute()
                authored_paper_ids = [paper['paper_id'] for paper in authored_papers.data] if authored_papers.data else []
                
                if authored_paper_ids:
                    # Published papers OR user's own papers
                    query = query.or_(f"status.eq.published,id.in.({','.join(authored_paper_ids)})")
                else:
                    query = query.eq('status', 'published')
        
        response = query.execute()
        return jsonify(response.data)
    except Exception as e:
        print(f"Error in get_papers_by_category: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/search-papers', methods=['GET'])
def search_papers():
    try:
        # Get search parameters
        query = request.args.get('q', '')
        category_id = request.args.get('category')
        user_id = request.args.get('user_id')
        
        # Build base query
        base_query = (
            supabase.table('papers')
            .select('*, categories(id, name)')
        )
        
        # Apply category filter if provided
        if category_id:
            base_query = base_query.eq('category_id', category_id)
        
        # Apply visibility filters based on user role
        if not user_id:
            # Not logged in - only published papers
            base_query = base_query.eq('status', 'published')
        else:
            # Check if user is staff
            user_profile = supabase.table('profiles').select('user_type').eq('id', user_id).single().execute()
            is_staff = user_profile.data and user_profile.data.get('user_type') == 'staff'
            
            if is_staff:
                # Staff can see all papers
                pass
            else:
                # Regular user - published papers + own drafts
                authored_papers = supabase.table('paper_authors').select('paper_id').eq('author_id', user_id).execute()
                authored_paper_ids = [paper['paper_id'] for paper in authored_papers.data] if authored_papers.data else []
                
                if authored_paper_ids:
                    # Published papers OR user's own papers
                    base_query = base_query.or_(f"status.eq.published,id.in.({','.join(authored_paper_ids)})")
                else:
                    base_query = base_query.eq('status', 'published')
        
        # Apply text search if provided
        if query:
            base_query = base_query.or_(f"title.ilike.%{query}%,abstract.ilike.%{query}%")
        
        # Execute query
        response = base_query.execute()
        return jsonify(response.data)
    except Exception as e:
        print(f"Error in search_papers: {str(e)}")
        return jsonify({"error": str(e)}), 500


@app.route('/api/notifications', methods=['GET'])
def get_user_notifications():
    """Get notifications for the current user"""
    try:
        user_id = request.args.get('user_id')
        
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400
            
        # Get unread count
        unread_query = (
            supabase.table('notifications')
            .select('id', 'count')
            .eq('user_id', user_id)
            .eq('read', False)
        )
        
        unread_response = unread_query.execute()
        unread_count = unread_response.count
        
        # Get limit and offset for pagination
        limit = int(request.args.get('limit', 20))
        offset = int(request.args.get('offset', 0))
        
        # Get notifications
        query = (
            supabase.table('notifications')
            .select('*')
            .eq('user_id', user_id)
            .order('created_at', {'ascending': False})
            .limit(limit)
            .offset(offset)
        )
        
        response = query.execute()
            
        return jsonify({
            "notifications": response.data,
            "unread_count": unread_count
        })
    except Exception as e:
        print(f"Error getting notifications: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/notifications/read', methods=['POST'])
def mark_notification_read():
    """Mark a notification as read"""
    try:
        data = request.json
        notification_id = data.get('notification_id')
        user_id = data.get('user_id')
        
        if not notification_id or not user_id:
            return jsonify({"error": "Notification ID and User ID are required"}), 400
            
        # Mark notification as read
        query = (
            supabase.table('notifications')
            .update({'read': True})
            .eq('id', notification_id)
            .eq('user_id', user_id)
        )
        
        response = query.execute()
            
        return jsonify({"success": True})
    except Exception as e:
        print(f"Error marking notification as read: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/notifications/read-all', methods=['POST'])
def mark_all_notifications_read():
    """Mark all notifications as read for a user"""
    try:
        data = request.json
        user_id = data.get('user_id')
        
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400
            
        # Mark all notifications as read
        query = (
            supabase.table('notifications')
            .update({'read': True})
            .eq('user_id', user_id)
            .eq('read', False)
        )
        
        response = query.execute()
            
        return jsonify({"success": True})
    except Exception as e:
        print(f"Error marking all notifications as read: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("Starting Agora backend server at http://0.0.0.0:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)