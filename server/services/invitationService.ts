import crypto from 'crypto';
import Invitation, { IInvitation } from '../models/Invitation';
import DashboardShare from '../models/DashboardShare';
import User from '../models/User';
import Project from '../models/Project';
import emailService from './emailService';

class InvitationService {
  /**
   * Generate a unique invitation token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Send invitations to multiple email addresses
   */
  async sendInvitations(
    projectId: string,
    invitedByUserId: string,
    emails: string[],
    message?: string
  ): Promise<{ success: string[]; failed: string[] }> {
    console.log(`📨 Sending invitations for project ${projectId} to ${emails.length} emails`);

    // Verify project exists and user has access
    const project = await Project.findById(projectId);
    if (!project) {
      console.error(`❌ Project not found: ${projectId}`);
      throw new Error('Project not found');
    }

    if (project.userId.toString() !== invitedByUserId) {
      console.error(`❌ User ${invitedByUserId} does not own project ${projectId}`);
      throw new Error('You do not have permission to invite users to this project');
    }

    const inviter = await User.findById(invitedByUserId);
    if (!inviter) {
      console.error(`❌ Inviter user not found: ${invitedByUserId}`);
      throw new Error('Inviter not found');
    }

    const success: string[] = [];
    const failed: string[] = [];

    for (const email of emails) {
      try {
        // Check if user already has access
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
          const existingShare = await DashboardShare.findOne({
            projectId,
            userId: existingUser._id,
          });

          if (existingShare) {
            console.log(`⚠️  User ${email} already has access to this dashboard`);
            failed.push(email);
            continue;
          }
        }

        // Check for existing pending invitation
        const existingInvitation = await Invitation.findOne({
          email: email.toLowerCase(),
          projectId,
          status: 'pending',
          expiresAt: { $gt: new Date() },
        });

        if (existingInvitation) {
          console.log(`⚠️  Pending invitation already exists for ${email}`);
          // Resend the invitation email
          await emailService.sendInvitationEmail(
            email,
            inviter.email,
            project.name,
            existingInvitation.token,
            message
          );
          success.push(email);
          continue;
        }

        // Create new invitation
        const token = this.generateToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

        const invitation = await Invitation.create({
          email: email.toLowerCase(),
          projectId,
          invitedBy: invitedByUserId,
          token,
          message,
          expiresAt,
          status: 'pending',
        });

        console.log(`✅ Created invitation for ${email} with token ${token}`);

        // Send invitation email
        await emailService.sendInvitationEmail(
          email,
          inviter.email,
          project.name,
          token,
          message
        );

        success.push(email);
      } catch (error) {
        console.error(`❌ Failed to send invitation to ${email}:`, error);
        failed.push(email);
      }
    }

    console.log(`📊 Invitation results: ${success.length} sent, ${failed.length} failed`);
    return { success, failed };
  }

  /**
   * Get invitation details by token
   */
  async getInvitationByToken(token: string): Promise<IInvitation | null> {
    console.log(`🔍 Looking up invitation with token: ${token}`);

    const invitation = await Invitation.findOne({ token })
      .populate('projectId', 'name')
      .populate('invitedBy', 'email');

    if (!invitation) {
      console.log(`⚠️  Invitation not found for token: ${token}`);
      return null;
    }

    // Check if expired
    if (invitation.expiresAt < new Date()) {
      console.log(`⚠️  Invitation expired for token: ${token}`);
      invitation.status = 'expired';
      await invitation.save();
      return null;
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      console.log(`⚠️  Invitation already accepted for token: ${token}`);
      return null;
    }

    console.log(`✅ Found valid invitation for ${invitation.email}`);
    return invitation;
  }

  /**
   * Accept invitation and create user account or grant access
   */
  async acceptInvitation(
    token: string,
    password: string
  ): Promise<{ user: any; project: any; accessToken: string; refreshToken: string }> {
    console.log(`🎉 Accepting invitation with token: ${token}`);

    const invitation = await this.getInvitationByToken(token);
    if (!invitation) {
      console.error(`❌ Invalid or expired invitation token: ${token}`);
      throw new Error('Invalid or expired invitation');
    }

    const project = await Project.findById(invitation.projectId);
    if (!project) {
      console.error(`❌ Project not found: ${invitation.projectId}`);
      throw new Error('Project not found');
    }

    // Check if user already exists
    let user = await User.findOne({ email: invitation.email });

    if (!user) {
      // Create new user
      console.log(`👤 Creating new user for ${invitation.email}`);
      const { generatePasswordHash } = await import('../utils/password');
      const hashedPassword = await generatePasswordHash(password);

      user = await User.create({
        email: invitation.email,
        password: hashedPassword,
        roles: ['user'],
      });

      console.log(`✅ User created: ${user._id}`);
    } else {
      console.log(`✅ User already exists: ${user._id}`);
    }

    // Create dashboard share
    const existingShare = await DashboardShare.findOne({
      projectId: invitation.projectId,
      userId: user._id,
    });

    if (!existingShare) {
      await DashboardShare.create({
        projectId: invitation.projectId,
        userId: user._id,
        sharedBy: invitation.invitedBy,
        accessLevel: 'viewer',
      });
      console.log(`✅ Dashboard share created for user ${user._id} and project ${project._id}`);
    } else {
      console.log(`ℹ️  Dashboard share already exists for user ${user._id}`);
    }

    // Mark invitation as accepted
    invitation.status = 'accepted';
    await invitation.save();
    console.log(`✅ Invitation marked as accepted`);

    // Generate tokens
    const { generateAccessToken, generateRefreshToken } = await import('../utils/auth');
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Update refresh token in database
    user.refreshToken = refreshToken;
    await user.save();

    // Send welcome email
    const dashboardUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard/${project._id}/shared`;
    await emailService.sendWelcomeEmail(
      user.email,
      user.email,
      project.name,
      dashboardUrl
    );

    console.log(`🎊 Invitation acceptance complete for ${user.email}`);

    return {
      user: {
        _id: user._id,
        email: user.email,
        roles: user.roles,
      },
      project: {
        _id: project._id,
        name: project.name,
      },
      accessToken,
      refreshToken,
    };
  }

  /**
   * Get all shared dashboards for a user
   */
  async getSharedDashboards(userId: string): Promise<any[]> {
    console.log(`📊 Fetching shared dashboards for user ${userId}`);

    const shares = await DashboardShare.find({ userId })
      .populate('projectId')
      .populate('sharedBy', 'email')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${shares.length} shared dashboards`);

    return shares.map((share) => ({
      _id: (share.projectId as any)._id,
      name: (share.projectId as any).name,
      status: (share.projectId as any).status,
      sharedBy: (share.sharedBy as any).email,
      sharedAt: share.createdAt,
      accessLevel: share.accessLevel,
    }));
  }

  /**
   * Get users who have access to a project
   */
  async getProjectSharedUsers(projectId: string, ownerId: string): Promise<any[]> {
    console.log(`👥 Fetching shared users for project ${projectId}`);

    // Verify ownership
    const project = await Project.findById(projectId);
    if (!project || project.userId.toString() !== ownerId) {
      console.error(`❌ User ${ownerId} does not own project ${projectId}`);
      throw new Error('You do not have permission to view this information');
    }

    const shares = await DashboardShare.find({ projectId })
      .populate('userId', 'email')
      .populate('sharedBy', 'email')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${shares.length} users with access`);

    return shares.map((share) => ({
      email: (share.userId as any).email,
      sharedBy: (share.sharedBy as any).email,
      sharedAt: share.createdAt,
      accessLevel: share.accessLevel,
    }));
  }

  /**
   * Check if a user has access to a project
   */
  async hasAccess(userId: string, projectId: string): Promise<boolean> {
    const project = await Project.findById(projectId);
    if (!project) {
      return false;
    }

    // Owner always has access
    if (project.userId.toString() === userId) {
      return true;
    }

    // Check if shared
    const share = await DashboardShare.findOne({ projectId, userId });
    return !!share;
  }
}

export default new InvitationService();
