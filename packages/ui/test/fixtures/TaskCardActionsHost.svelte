<script lang="ts">
  // Test harness: publishes the task-actions accessor via context, then
  // renders a TaskCard so we can assert action-button behaviour.
  import { setContext } from 'svelte';
  import type { Task } from '@markdown-board/core';
  import TaskCard from '../../src/components/TaskCard.svelte';
  import { TASK_ACTIONS_KEY, type TaskActionEntry } from '../../src/lib/task-actions.js';

  interface Props {
    task: Task;
    sectionId?: string;
    actions: TaskActionEntry[];
  }

  const { task, sectionId, actions }: Props = $props();
  setContext(TASK_ACTIONS_KEY, () => actions);
</script>

<TaskCard {task} {...sectionId ? { sectionId } : {}} />
