import { CompanionVariableDefinition, InstanceBase } from '@companion-module/base'
import { ShotLoaderConfig } from './config'

interface RecorderData {
  id: string
  name: string
  takeName: string
  ipAddress: string
  shotNumber?: number
  takeNumber?: number
  transportState?: 'play' | 'stop' | 'record' | 'next' | 'prev'
}

export function getVariableDefinitions(): CompanionVariableDefinition[] {
  return [
    {
      name: 'Take Name',
      variableId: 'take'
    },
    {
      name: 'Take Number',
      variableId: 'take_num'
    },
    {
      name: 'Shot Number',
      variableId: 'shot_num'
    },
    {
      name: 'IP Address',
      variableId: 'ip'
    },
    {
      name: 'Transport State',
      variableId: 'transport'
    }
  ]
}

export function updateVariables(
  instance: InstanceBase<ShotLoaderConfig>,
  recorders: Map<string, RecorderData>,
  showName?: string,
  config?: ShotLoaderConfig
): void {
  const newDefinitions: CompanionVariableDefinition[] = [
    {
      name: 'Take Name',
      variableId: 'take'
    },
    {
      name: 'Take Number',
      variableId: 'take_num'
    },
    {
      name: 'Shot Number',
      variableId: 'shot_num'
    },
    {
      name: 'IP Address',
      variableId: 'ip'
    },
    {
      name: 'Transport State',
      variableId: 'transport'
    }
  ]

  const variables: { [key: string]: string | number } = {}

  // Create variables for each recorder
  recorders.forEach((recorder, recorderId) => {
    const sanitizedId = recorderId.replace(/[^a-zA-Z0-9]/g, '_')
    
    // Add per-recorder variables
    newDefinitions.push(
      {
        name: `${recorder.name} - Name`,
        variableId: `${sanitizedId}_name`
      },
      {
        name: `${recorder.name} - Take Name`,
        variableId: `${sanitizedId}_take`
      },
      {
        name: `${recorder.name} - Transport State`,
        variableId: `${sanitizedId}_transport`
      },
      {
        name: `${recorder.name} - Shot Number`,
        variableId: `${sanitizedId}_shot_num`
      },
      {
        name: `${recorder.name} - Take Number`,
        variableId: `${sanitizedId}_take_num`
      }
    )
    
    variables[`${sanitizedId}_name`] = recorder.name
    variables[`${sanitizedId}_take`] = recorder.takeName || 'Not Set'
    variables[`${sanitizedId}_transport`] = recorder.transportState || 'stopped'
    variables[`${sanitizedId}_shot_num`] = recorder.shotNumber || 1
    variables[`${sanitizedId}_take_num`] = recorder.takeNumber || 1
  })

  // Get the first recorder for legacy variables
  const recorder = recorders.values().next().value
  variables['take'] = recorder?.takeName || 'Not Set'
  variables['take_num'] = recorder?.takeNumber || 1
  variables['shot_num'] = recorder?.shotNumber || 1
  variables['ip'] = recorder?.ipAddress || 'Unknown'
  variables['transport'] = recorder?.transportState || 'stopped'

  instance.setVariableDefinitions(newDefinitions)
  instance.setVariableValues(variables)
}
