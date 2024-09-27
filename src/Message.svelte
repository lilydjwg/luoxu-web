<script lang="ts">
  import { onMount, getContext } from "svelte";

  export let msg: {
    from_name: string;
    t;
    edited;
    group_id: string;
    id: string;
    from_id: string;
    html: string;
  };
  export let groupinfo: string[][];
  export let now: Date;

  const formatter = new Intl.DateTimeFormat(undefined, {
    timeStyle: "full",
    dateStyle: "full",
    hour12: false,
  });
  const format_dt = formatter.format;
  let dt = new Date(msg.t * 1000);
  let edited = msg.edited ? new Date(msg.edited * 1000) : null;
  let title =
    format_dt(dt) + (edited ? `\n最后编辑于：${format_dt(edited)}` : "");
  let relative_dt = format_relative_time(dt, now);
  let iso_date = dt.toISOString();
  let msgurl = groupinfo[msg.group_id][0]
    ? `tg://resolve?domain=${groupinfo[msg.group_id][0]}&post=${msg.id}`
    : `tg://privatepost?channel=${msg.group_id}&post=${msg.id}`;

  function format_relative_time(d1: Date, d2: Date) {
    // in miliseconds
    const units = {
      year: 24 * 60 * 60 * 1000 * 365,
      month: (24 * 60 * 60 * 1000 * 365) / 12,
      day: 24 * 60 * 60 * 1000,
      hour: 60 * 60 * 1000,
      minute: 60 * 1000,
      second: 1000,
    };

    const rtf = new Intl.RelativeTimeFormat();
    // https://stackoverflow.com/a/60688789
    const elapsed = d1.valueOf() - d2.valueOf();

    for (const [u, period] of Object.entries(units)) {
      if (Math.abs(elapsed) > period || u === "second") {
        // https://stackoverflow.com/a/64972112
        return rtf.format(
          Math.round(elapsed / period),
          u as Intl.RelativeTimeFormatUnit
        );
      }
    }
  }
</script>

<div class="message">
  <img
    class="avatar"
    src="{getContext('LUOXU_URL')}/avatar/{msg.from_id}.jpg"
    height="64"
    width="64"
    alt="{msg.from_name} 的头像"
  />
  <div class="content">
    <div class="name">{msg.from_name || " "}</div>
    <div class="text">{@html msg.html}</div>
    <div class="time">
      {groupinfo[msg.group_id][1]}
      <a href={msgurl}><time datetime={iso_date} {title}>{relative_dt}</time></a
      >
    </div>
  </div>
</div>

<style>
  .message {
    margin: 1em 0;
    padding: 0.5em;
    max-width: max-content;
    border: 1px solid var(--color-msg-border);
    box-shadow: 0 0 3px var(--color-shadow);
    border-radius: 5px;
    display: flex;
  }
  .avatar {
    padding-right: 0.5em;
  }
  .content {
    overflow: hidden;
  }
  .name {
    white-space: nowrap;
    color: var(--color-username);
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .text {
    white-space: pre-wrap;
    margin: 0.2em 0;
  }
  .text > :global(.keyword) {
    background-color: var(--color-keyword-bg);
  }
  .time {
    font-size: 0.75em;
    float: right;
    /* make room for outline */
    margin-right: 2px;
  }
  .time,
  .time > a {
    color: var(--color-text-dim);
  }
</style>
