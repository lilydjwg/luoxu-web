<script>
  import { onMount, getContext } from 'svelte'

  export let msg
  export let groupinfo
  export let now

  const formatter = new Intl.DateTimeFormat(undefined, {
    timeStyle: "full",
    dateStyle: "full",
    hour12: false,
  })

  let dt = new Date(msg.t * 1000)
  let edited = msg.edited ? new Date(msg.edited * 1000) : null
  let title = format_dt(dt) + (edited ? `\n最后编辑于：${format_dt(edited)}` : '')
  let relative_dt = format_relative_time(dt, now)
  let iso_date = dt.toISOString()
  let msgurl = groupinfo[msg.group_id][0] ? `tg://resolve?domain=${groupinfo[msg.group_id][0]}&post=${msg.id}` : `tg://privatepost?channel=${msg.group_id}&post=${msg.id}`

  function format_relative_time(d1, d2) {
    // in miliseconds
    const units = {
      year  : 24 * 60 * 60 * 1000 * 365,
      month : 24 * 60 * 60 * 1000 * 365 / 12,
      day   : 24 * 60 * 60 * 1000,
      hour  : 60 * 60 * 1000,
      minute: 60 * 1000,
      second: 1000,
    }

    const rtf = new Intl.RelativeTimeFormat()

    const elapsed = d1 - d2

    for(const u in units) {
      if(Math.abs(elapsed) > units[u] || u == 'second')  {
        return rtf.format(Math.round(elapsed/units[u]), u)
      }
    }

  }

  function format_dt(t) {
    return formatter.format(t)
  }

</script>

<div class="message">
  <img class="avatar" src="{getContext('LUOXU_URL')}/avatar/{msg.from_id}.jpg" height="64" width="64" alt="{msg.from_name} 的头像"/>
  <div class="content">
    <div class="name">{msg.from_name || ' '}</div>
    <div class="text">{@html msg.html}</div>
    <div class="time">{groupinfo[msg.group_id][1]} <a href={msgurl}><time datetime={iso_date} title={title}>{relative_dt}</time></a></div>
  </div>
</div>

<style>
  .message {
    margin: 1em 0;
    padding: 0.5em;
    max-width: max-content;
    border: 1px #eeeeee solid;
    box-shadow: 0 0 3px gray;
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
    color: #1e90ff;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .text {
    white-space: pre-wrap;
    margin: 0.2em 0;
  }
  .text >:global(.keyword) {
    background-color: #ffffab;
  }
  .time {
    font-size: 0.75em;
    float: right;
  }
  .time, .time > a {
    color: gray;
  }
</style>
