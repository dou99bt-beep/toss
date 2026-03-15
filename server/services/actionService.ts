import supabase from '../db';

export const actionService = {
  async approveAndExecute(actionId: string, reason: string) {
    // 1. Find the action
    const { data: action, error: findError } = await supabase
      .from('recommended_actions')
      .select('*')
      .eq('id', actionId)
      .single();

    if (findError || !action || action.status !== 'PENDING') {
      return null;
    }

    // 2. Update status to APPROVED
    const { data: updatedAction, error: updateError } = await supabase
      .from('recommended_actions')
      .update({ status: 'APPROVED' })
      .eq('id', actionId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 3. Create crawler job for execution
    const { error: jobError } = await supabase
      .from('crawler_jobs')
      .insert({
        job_type: 'EXECUTE_ACTION',
        payload: JSON.stringify({
          action_id: updatedAction.id,
          arm_id: updatedAction.arm_id,
          action_type: updatedAction.action_type,
          reason: reason
        })
      });

    if (jobError) throw jobError;

    return updatedAction;
  },
};
