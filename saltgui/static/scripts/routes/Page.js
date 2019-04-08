import {DropDownMenu} from '../DropDown.js';
import {Output} from '../output/Output.js';
import {Route} from './Route.js';
import {TargetType} from '../TargetType.js';
import {Utils} from '../Utils.js';

export class PageRoute extends Route {

  constructor(path, name, page_selector, menuitem_selector, router) {
    super(path, name, page_selector, menuitem_selector, router);

    this._runCommand = this._runCommand.bind(this);
    this._runningJobs = this._runningJobs.bind(this);
    this._startRunningJobs = this._startRunningJobs.bind(this);
    this._updateJobs = this._updateJobs.bind(this);
    this._updateMinions = this._updateMinions.bind(this);
    this._getJobDetails = this._getJobDetails.bind(this);
  }

  _updateMinions(data) {
    const minions = data.return[0];

    const list = this.getPageElement().querySelector("#minions");
    const hostnames = Object.keys(minions).sort();

    // save for the autocompletion
    window.localStorage.setItem("minions", JSON.stringify(hostnames));

    for(const hostname of hostnames) {
      const minion_info = minions[hostname];

      // minions can be offline, then the info will be false
      if(minion_info === false) {
        this._updateOfflineMinion(list, hostname);
      } else {
        this._updateMinion(list, minion_info, hostname);
      }
    }
  }

  _getElement(container, id) {
    let element = document.getElementById(id);

    if(element === null) {
      // minion not found on screen...
      // construct a basic element that can be updated
      element = document.createElement("tr");
      element.id = id;
      container.appendChild(element);
      return element;
    }

    // remove existing content
    while(element.firstChild) {
      element.removeChild(element.firstChild);
    }

    return element;
  }

  _updateOfflineMinion(container, hostname) {
    const element = this._getElement(container, hostname);

    element.appendChild(Route._createTd("hostname", hostname));

    const offline = Route._createTd("status", "offline");
    offline.classList.add("offline");
    element.appendChild(offline);
  }

  _getBestIpNumber(minion) {
    if(!minion) return null;
    const ipv4 = minion.fqdn_ip4;
    if(!ipv4) return null;
    // either a string or something strange
    if(!Array.isArray(ipv4)) return ipv4;

    // so, it is an array

    // get the public IP number (if any)
    for(const s of ipv4) {
      // local = 127.0.0.0/8
      if(s.startsWith("127.")) continue;
      // private A = 10.0.0.0/8
      if(s.startsWith("10.")) continue;
      // private B = 172.16.0.0/20
      if(s.startsWith("172.16.")) continue;
      if(s.startsWith("172.17.")) continue;
      if(s.startsWith("172.18.")) continue;
      if(s.startsWith("172.19.")) continue;
      if(s.startsWith("172.20.")) continue;
      if(s.startsWith("172.21.")) continue;
      if(s.startsWith("172.22.")) continue;
      if(s.startsWith("172.23.")) continue;
      if(s.startsWith("172.24.")) continue;
      if(s.startsWith("172.25.")) continue;
      if(s.startsWith("172.26.")) continue;
      if(s.startsWith("172.27.")) continue;
      if(s.startsWith("172.28.")) continue;
      if(s.startsWith("172.29.")) continue;
      if(s.startsWith("172.30.")) continue;
      if(s.startsWith("172.31.")) continue;
      // private C = 192.168.0.0/16
      if(s.startsWith("192.168.")) continue;
      // not a local/private address, therefore it is public
      return s;
    }

    // no public IP number
    // get the private IP number (if any)
    for(const s of ipv4) {
      // local = 127.0.0.0/8
      if(s.startsWith("127.")) continue;
      // not a local address, therefore it is private
      return s;
    }

    // just pick the first one, should then be a local address
    return ipv4[0];
  }

  _updateMinion(container, minion, hostname) {

    const element = this._getElement(container, hostname);

    element.appendChild(Route._createTd("hostname", hostname));

    const ipv4 = this._getBestIpNumber(minion);
    if(ipv4) {
      const addressTd = Route._createTd("status", "");
      const addressSpan = Route._createSpan("status2", ipv4);
      addressTd.appendChild(addressSpan);
      // ipnumbers do not sort well, reformat into something sortable
      const ipv4parts = ipv4.split(".");
      let sorttable_customkey = "";
      if(ipv4parts.length === 4) {
        // never mind adding '.'; this is only a sort-key
        for(let i = 0; i < 4; i++) sorttable_customkey += ipv4parts[i].padStart(3, "0");
        addressTd.setAttribute("sorttable_customkey", sorttable_customkey);
      }
      addressTd.classList.add("address");
      addressTd.setAttribute("tabindex", -1);
      addressSpan.addEventListener("click", this._copyAddress);
      addressSpan.addEventListener("mouseout", this._restoreClickToCopy);
      Utils.addToolTip(addressSpan, "Click to copy");
      element.appendChild(addressTd);
    } else {
      const accepted = Route._createTd("status", "accepted");
      accepted.classList.add("accepted");
      element.appendChild(accepted);
    }

    let saltversion = "---";
    if(minion && minion.saltversion) saltversion = minion.saltversion;
    if(minion) element.appendChild(Route._createTd("saltversion", saltversion));

    let os = "---";
    if(minion && minion.os && minion.osrelease) os = minion.os + " " + minion.osrelease;
    else if(minion && minion.os) os = minion.os;
    if(minion) {
      const td = Route._createTd("os", os);
      if(minion.os) {
        const img = document.createElement("img");
        img.setAttribute("src", "static/images/os-" + minion.os.replace(" ", "-").toLowerCase() + ".png");
        img.classList.add("osimage");
        td.prepend(img);
      }
      element.appendChild(td);
    }
  }

  _addMinion(container, hostname, freeColumns = 0) {

    let element = document.getElementById(hostname);
    if(element !== null) {
      // minion already on screen...
      return;
    }

    element = document.createElement("tr");
    element.id = hostname;

    element.appendChild(Route._createTd("hostname", hostname));

    const minion = Route._createTd("status", "accepted");
    minion.classList.add("accepted");
    element.appendChild(minion);

    element.appendChild(Route._createTd("os", "loading..."));

    // fill out the number of columns to that of the header
    while(element.cells.length < container.tHead.rows[0].cells.length - freeColumns) {
      element.appendChild(Route._createTd("", ""));
    }

    container.tBodies[0].appendChild(element);
  }

  _addNone(container) {
    const tr = document.createElement("tr");
    const td = Route._createTd("hostname", "none");
    td.setAttribute("colspan", container.rows[0].cells.length);
    tr.appendChild(td);
    container.appendChild(tr);
  }

  _updateJobs(data, numberOfJobs = 7, detailedJob = false) {
    const jobContainer = this.getPageElement().querySelector(".jobs tbody");
    const jobs = this._jobsToArray(data.return[0]);
    this._sortJobs(jobs);

    //Add <numberOfJobs> most recent jobs
    let shown = 0;
    let i = 0;
    while(shown < numberOfJobs && jobs[i] !== undefined) {
      const job = jobs[i];
      i = i + 1;
      if(job.Function === "grains.append") continue;
      if(job.Function === "grains.delkey") continue;
      if(job.Function === "grains.delval") continue;
      if(job.Function === "grains.items") continue;
      if(job.Function === "grains.setval") continue;
      if(job.Function === "pillar.items") continue;
      if(job.Function === "pillar.obfuscate") continue;
      if(job.Function === "runner.jobs.active") continue;
      if(job.Function === "runner.jobs.list_job") continue;
      if(job.Function === "runner.jobs.list_jobs") continue;
      if(job.Function === "saltutil.find_job") continue;
      if(job.Function === "saltutil.refresh_grains") continue;
      if(job.Function === "saltutil.refresh_pillar") continue;
      if(job.Function === "saltutil.running") continue;
      if(job.Function === "schedule.delete") continue;
      if(job.Function === "schedule.disable") continue;
      if(job.Function === "schedule.disable_job") continue;
      if(job.Function === "schedule.enable") continue;
      if(job.Function === "schedule.enable_job") continue;
      if(job.Function === "schedule.list") continue;
      if(job.Function === "schedule.modify") continue;
      if(job.Function === "schedule.run_job") continue;
      if(job.Function === "sys.doc") continue;
      if(job.Function === "wheel.config.values") continue;
      if(job.Function === "wheel.key.accept") continue;
      if(job.Function === "wheel.key.delete") continue;
      if(job.Function === "wheel.key.list_all") continue;
      if(job.Function === "wheel.key.reject") continue;
      if(job.Function === "wheel.key.finger") continue;

      if(detailedJob) {
        this._addDetailedJob(jobContainer, job);
      } else {
        this._addJob(jobContainer, job);
      }
      shown = shown + 1;
    }
    this.jobsLoaded = true;
    if(this.keysLoaded && this.jobsLoaded) this.resolvePromise();
  }

  _runningJobs(data, jobsStatus = false) {
    const jobs = data.return[0];

    // update all running jobs
    for(const k in jobs)
    {
      const job = jobs[k];

      let targetText = "";
      let targetField;
      if(jobsStatus) {
        targetField = document.querySelector(".jobs tr#job" + k + " td.status span");
      } else {
        // start with same text as for _addJob
        targetText = TargetType.makeTargetText(job["Target-type"], job.Target) + ", ";
        targetField = document.querySelector(".jobs td#job" + k + " div.target span");
      }
      if(targetText.length > 50) {
        // prevent column becoming too wide
        // yes, the addition of running/returned may again make
        // the string longer than 50 characters, we accept that
        targetText = targetText.substring(0, 50) + "...";
      }
      // then add the operational statistics
      if(job.Running.length > 0)
        targetText = targetText + job.Running.length + " running";
      if(job.Returned.length > 0)
        targetText = targetText + ", " + job.Returned.length + " returned";

      // the field may not (yet) be on the screen
      if(!targetField) continue;
      targetField.classList.remove("no_status");
      targetField.innerText = targetText;
      if(jobsStatus) Utils.addToolTip(targetField, "Click to refresh column");
    }

    // update all finished jobs
    for(const tr of document.querySelector("table#jobs tbody").rows) {
      const statusField = tr.querySelector("td.status span.no_status");
      if(!statusField) continue;
      statusField.classList.remove("no_status");
      statusField.innerText = "done";
      // we show the tooltip here so that the user is invited to click on this
      // the user then sees other rows being updated without becoming invisible
      Utils.addToolTip(statusField, "Click to refresh column");
    }
  }

  _addJob(container, job) {
    const tr = document.createElement("tr");

    const td = document.createElement("td");

    td.id = "job" + job.id;
    let targetText = TargetType.makeTargetText(job["Target-type"], job.Target);
    if(targetText.length > 50) {
      // prevent column becoming too wide
      targetText = targetText.substring(0, 50) + "...";
    }
    const div = Route._createDiv("target", "");
    const span = Route._createSpan("target2", targetText);
    div.appendChild(span);
    td.appendChild(div);
    /* effectively also the whole column, but it does not look like a column on screen */
    Utils.addToolTip(div, "Click to refresh");

    const functionText = job.Function;
    td.appendChild(Route._createDiv("function", functionText));

    const startTimeText = Output.dateTimeStr(job.StartTime);
    td.appendChild(Route._createDiv("time", startTimeText));

    tr.appendChild(td);

    const menu = new DropDownMenu(tr);
    menu.addMenuItem("Show&nbsp;details", function(evt) {
      window.location.assign("/job?id=" + encodeURIComponent(job.id));
    }.bind(this));

    container.appendChild(tr);

    tr.addEventListener("click", evt => window.location.assign("/job?id=" + encodeURIComponent(job.id)));
  }

  _addDetailedJob(container, job) {
    const tr = document.createElement("tr");
    tr.id = "job" + job.id;
    const jidText = job.id;
    tr.appendChild(Route._createTd("job" + job.id, jidText));

    let targetText = TargetType.makeTargetText(job["Target-type"], job.Target);
    if(targetText.length > 50) {
      // prevent column becoming too wide
      targetText = targetText.substring(0, 50) + "...";
    }
    tr.appendChild(Route._createTd("target", targetText));

    const argumentsText = this._decodeArgumentsText(job.Arguments);
    let functionText = job.Function + argumentsText;
    if(functionText.length > 50) {
      // prevent column becoming too wide
      functionText = functionText.substring(0, 50) + "...";
    }
    tr.appendChild(Route._createTd("function", functionText));

    const startTimeText = Output.dateTimeStr(job.StartTime);
    tr.appendChild(Route._createTd("starttime", startTimeText));

    const menu = new DropDownMenu(tr);
    menu.addMenuItem("Show&nbsp;details", function(evt) {
      window.location.assign("/job?id=" + encodeURIComponent(job.id));
    }.bind(this));
    menu.addMenuItem("Update&nbsp;details", function(evt) {
      this._getJobDetails(job.id);
      evt.stopPropagation();
    }.bind(this));
    menu.addMenuItem("Re-run&nbsp;job...", function(evt) {
      this._runFullCommand(evt, job["Target-type"], job.Target, functionText);
    }.bind(this));

    const tdStatus = Route._createTd("status", "");
    const spanStatus = Route._createSpan("status2", "loading...");
    spanStatus.classList.add("no_status");
    spanStatus.addEventListener("click", evt => {
      // show "loading..." only once, but we are updating the whole column
      spanStatus.classList.add("no_status");
      spanStatus.innerText = "loading...";
      this._startRunningJobs(true);
      evt.stopPropagation();
    });
    tdStatus.appendChild(spanStatus);
    tr.appendChild(tdStatus);

    const tdDetails = Route._createTd("details", "");
    const spanDetails = Route._createSpan("details2", "(click)");
    spanDetails.classList.add("no_status");
    spanDetails.addEventListener("click", evt => {
      spanDetails.classList.add("no_status");
      spanDetails.innerText = "loading...";
      this._getJobDetails(job.id);
      evt.stopPropagation();
    });
    Utils.addToolTip(spanDetails, "Click to refresh");
    tdDetails.appendChild(spanDetails);
    tr.appendChild(tdDetails);

    // fill out the number of columns to that of the header
    while(tr.cells.length < container.parentElement.tHead.rows[0].cells.length) {
      tr.appendChild(Route._createTd("", ""));
    }

    container.appendChild(tr);

    tr.addEventListener("click", evt => window.location.assign("/job?id=" + encodeURIComponent(job.id)));
  }

  _startRunningJobs(flag) {
    const p = this;
    this.router.api.getRunnerJobsActive().then(data => {
      p._runningJobs(data, flag);
    });
  }

  _jobsToArray(jobs) {
    const keys = Object.keys(jobs);
    const newArray = [];

    for(const key of keys) {
      const job = jobs[key];
      job.id = key;
      newArray.push(job);
    }

    return newArray;
  }

  _sortJobs(jobs) {
    jobs.sort(function(a, b){
      // The id is already a integer value based on the date, let's use
      // it to sort the jobs
      if(a.id < b.id) return 1;
      if(a.id > b.id) return -1;
      return 0;
    });
  }

  _showJobDetailSummary(jobid, data) {
    data = data.return[0];

    let str = "";

    if(data.Minions.length === 1)
      str = "1 minion";
    else
      str = data.Minions.length + " minions";

    const keyCount = Object.keys(data.Result).length;
    str += ", ";
    if(keyCount == data.Minions.length)
      str += "<span style='color: green'>";
    else
      str += "<span style='color: red'>";
    if(keyCount === 1)
      str += "1 result";
    else
      str += "" + keyCount + " results";
    str += "</span>";

    const summary = { };
    for(const minion in data.Result) {
      const result = data.Result[minion];
      // use keys that can conveniently be sorted
      const key = (result.success ? "0-" : "1-") + result.retcode;
      if(summary.hasOwnProperty(key))
        summary[key] += 1;
      else
        summary[key] = 1;
    }

    const keys = Object.keys(summary).sort();
    for(const key of keys) {
      str += ", ";
      if(key === "0-0") {
        // don't show the retcode here
        str += "<span style='color: green'>";
        str += summary[key] + " success";
        str += "</span>";
      } else if(key.startsWith("0-")) {
        str += "<span style='color: orange'>";
        str += summary[key] + " success(" + key.substr(2) + ")";
        str += "</span>";
      } else { // if(key.startsWith("1-"))
        str += "<span style='color: red'>";
        str += summary[key] + " failure(" + key.substr(2) + ")";
        str += "</span>";
      }
    }

    const detailsSpan = document.querySelector(".jobs #job" + jobid + " td.details span");
    if(!detailsSpan) return;
    detailsSpan.innerHTML = str;
    detailsSpan.classList.remove("no_status");
    Utils.addToolTip(detailsSpan, "Click to refresh");
  }

  _getJobDetails(jobid) {
    const p = this;
    this.router.api.getRunnerJobsListJob(jobid).then(data => {
      p._showJobDetailSummary(jobid, data);
    });
  }

  _copyAddress(evt) {
    const target = evt.target;
    const selection = window.getSelection();
    const range = document.createRange();

    range.selectNodeContents(target);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("copy");

    Utils.addToolTip(target, "2Copied!");

    evt.stopPropagation();
  }

  _restoreClickToCopy(evt) {
    const target = evt.target;
    Utils.addToolTip(target, "1Click to copy");
  }

}
