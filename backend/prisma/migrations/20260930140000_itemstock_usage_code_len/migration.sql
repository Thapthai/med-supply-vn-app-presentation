-- UsageCode = itemcode-YYmm-0000X อาจยาวกว่า 20
ALTER TABLE `itemstock`
  MODIFY `UsageCode` VARCHAR(40) NULL;
