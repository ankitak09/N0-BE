/** Topic naming: n0.<service-slug>.<entity>.<event> */
export const KafkaTopics = {
  CREATED: "n0.__SERVICE_SLUG__.__resource__.created",
} as const;
