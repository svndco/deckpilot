import { CompanionActionDefinitions, InstanceBase } from '@companion-module/base'
import { ShotLoaderConfig } from './config'

interface ShotLoaderInstance extends InstanceBase<ShotLoaderConfig> {
  getRecorders: () => Map<string, any>
}

export function getActions(instance: ShotLoaderInstance): CompanionActionDefinitions {
  // No actions available - module receives OSC messages only
  return {}
}
