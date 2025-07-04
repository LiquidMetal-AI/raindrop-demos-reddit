// Code generated by raindrop build, DO NOT EDIT.
import { Ai, Annotation, App, Logger, MRNObject, SmartBucket, SqlDatabase,  } from '@liquidmetal-ai/raindrop-framework';

export interface Env {
  _raindrop: {
    app: App;
  };
  AI: Ai;
  annotation: Annotation<Omit<MRNObject, 'type' | 'applicationName' | 'versionId'>>;
  DREAMS_BUCKET: SmartBucket;
  DREAMS_DB: SqlDatabase;
  logger: Logger;
}
