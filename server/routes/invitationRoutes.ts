import express, { Request, Response } from 'express';
import { requireUser } from './middlewares/auth';
import invitationService from '../services/invitationService';

const router = express.Router();

// Description: Send invitation(s) to email addresses for a dashboard
// Endpoint: POST /api/invitations/send
// Request: { projectId: string, emails: string[], message?: string }
// Response: { success: string[], failed: string[], message: string }
router.post('/send', requireUser(), async (req: Request, res: Response) => {
  try {
    const { projectId, emails, message } = req.body;

    console.log(`📨 Invitation request for project ${projectId} from user ${req.user._id}`);

    // Validation
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'At least one email address is required' });
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter((email) => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return res.status(400).json({
        error: `Invalid email address(es): ${invalidEmails.join(', ')}`,
      });
    }

    const result = await invitationService.sendInvitations(
      projectId,
      req.user._id.toString(),
      emails,
      message
    );

    const statusCode = result.failed.length > 0 ? 207 : 200; // 207 Multi-Status if partial success

    res.status(statusCode).json({
      success: result.success,
      failed: result.failed,
      message: `Invitations sent to ${result.success.length} user(s)${
        result.failed.length > 0 ? `, ${result.failed.length} failed` : ''
      }`,
    });
  } catch (error: unknown) {
    console.error('❌ Error sending invitations:', error);
    const err = error as Error;
    res.status(500).json({ error: err.message || 'Failed to send invitations' });
  }
});

// Description: Get all dashboards shared with the current user
// Endpoint: GET /api/invitations/shared-dashboards
// Request: {}
// Response: { dashboards: Array<{ _id: string, name: string, status: string, sharedBy: string, sharedAt: Date, accessLevel: string }> }
router.get('/shared-dashboards', requireUser(), async (req: Request, res: Response) => {
  try {
    console.log(`📊 Fetching shared dashboards for user ${req.user._id}`);

    const dashboards = await invitationService.getSharedDashboards(req.user._id.toString());

    res.status(200).json({ dashboards });
  } catch (error: unknown) {
    console.error('❌ Error fetching shared dashboards:', error);
    const err = error as Error;
    res.status(500).json({ error: err.message || 'Failed to fetch shared dashboards' });
  }
});

// Description: Get users who have access to a project
// Endpoint: GET /api/invitations/project/:projectId/users
// Request: {}
// Response: { users: Array<{ email: string, sharedBy: string, sharedAt: Date, accessLevel: string }> }
router.get('/project/:projectId/users', requireUser(), async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    console.log(`👥 Fetching shared users for project ${projectId}`);

    const users = await invitationService.getProjectSharedUsers(
      projectId,
      req.user._id.toString()
    );

    res.status(200).json({ users });
  } catch (error: unknown) {
    console.error('❌ Error fetching project users:', error);
    const err = error as Error;
    res.status(500).json({ error: err.message || 'Failed to fetch project users' });
  }
});

// Description: Accept invitation and set password
// Endpoint: POST /api/invitations/:token/accept
// Request: { password: string }
// Response: { user: { _id: string, email: string }, project: { _id: string, name: string }, accessToken: string, refreshToken: string }
router.post('/:token/accept', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    console.log(`🎉 Accepting invitation with token: ${token}`);

    // Validation
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const result = await invitationService.acceptInvitation(token, password);

    res.status(200).json(result);
  } catch (error: unknown) {
    console.error('❌ Error accepting invitation:', error);
    const err = error as Error;
    res.status(500).json({ error: err.message || 'Failed to accept invitation' });
  }
});

// Description: Get invitation details by token
// Endpoint: GET /api/invitations/:token
// Request: {}
// Response: { invitation: { email: string, projectName: string, invitedBy: string, message?: string } }
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    console.log(`🔍 Fetching invitation details for token: ${token}`);

    const invitation = await invitationService.getInvitationByToken(token);

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found or expired' });
    }

    res.status(200).json({
      invitation: {
        email: invitation.email,
        projectName: (invitation.projectId as { name: string }).name,
        invitedBy: (invitation.invitedBy as { email: string }).email,
        message: invitation.message,
      },
    });
  } catch (error: unknown) {
    console.error('❌ Error fetching invitation:', error);
    const err = error as Error;
    res.status(500).json({ error: err.message || 'Failed to fetch invitation' });
  }
});

export default router;
