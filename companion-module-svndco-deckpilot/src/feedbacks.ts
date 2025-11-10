import { CompanionFeedbackDefinitions, combineRgb, InstanceBase } from '@companion-module/base'
import { ShotLoaderConfig } from './config'

interface ShotLoaderInstance extends InstanceBase<ShotLoaderConfig> {
  getRecorders: () => Map<string, any>
  getTakeName: (recorderId: string) => string
}

export function getFeedbacks(instance: ShotLoaderInstance): CompanionFeedbackDefinitions {
  const recorders = instance.getRecorders()
  const recorderChoices = Array.from(recorders.values()).map((r) => ({
    id: r.id,
    label: r.name
  }))

  return {
    take_name_set: {
      type: 'boolean',
      name: 'Take Name is Set',
      description: 'Changes color if take name is set for selected recorder',
      defaultStyle: {
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(0, 204, 0)
      },
      options: [
        {
          type: 'dropdown',
          label: 'Recorder',
          id: 'recorderId',
          default: recorderChoices[0]?.id || '',
          choices: recorderChoices,
          minChoicesForSearch: 5
        }
      ],
      callback: (feedback) => {
        const recorderId = feedback.options.recorderId as string
        const takeName = instance.getTakeName(recorderId)
        return takeName !== ''
      }
    },
    take_name_matches: {
      type: 'boolean',
      name: 'Take Name Matches',
      description: 'Changes color if take name matches expected value',
      defaultStyle: {
        color: combineRgb(255, 255, 255),
        bgcolor: combineRgb(0, 102, 204)
      },
      options: [
        {
          type: 'dropdown',
          label: 'Recorder',
          id: 'recorderId',
          default: recorderChoices[0]?.id || '',
          choices: recorderChoices,
          minChoicesForSearch: 5
        },
        {
          type: 'textinput',
          label: 'Expected Take Name',
          id: 'expectedName',
          default: '',
          useVariables: true
        }
      ],
      callback: async (feedback) => {
        const recorderId = feedback.options.recorderId as string
        const expectedName = await instance.parseVariablesInString(feedback.options.expectedName as string)
        const currentName = instance.getTakeName(recorderId)
        return currentName === expectedName
      }
    }
  }
}
