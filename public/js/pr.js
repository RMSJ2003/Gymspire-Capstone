const exercises = window.exercises || [];

const resultDiv = document.querySelector("#prResult");
const targetGrid = document.getElementById("targetGrid");

const targetModal = document.getElementById("targetModal");
const closeTargetModal = document.getElementById("closeTargetModal");

const targetTitle = document.getElementById("targetTitle");
const targetExerciseList = document.getElementById("targetExerciseList");


// GROUP BY TARGET
const grouped = {};

exercises.forEach(ex => {

  if(!grouped[ex.target]) grouped[ex.target] = [];

  grouped[ex.target].push(ex);

});


// CREATE MUSCLE CARDS
Object.keys(grouped).forEach(target => {

  const card = document.createElement("div");

  card.className = "target-card";
  card.textContent = target;

  card.addEventListener("click", () => openTargetModal(target));

  targetGrid.appendChild(card);

});


// OPEN EXERCISE MODAL
function openTargetModal(target){

  targetTitle.textContent = target;
  targetExerciseList.innerHTML = "";

  grouped[target].forEach(exercise => {

    const row = document.createElement("div");
    row.className = "exercise-row";

    row.innerHTML = `
      <span>${exercise.name}</span>
      <button>View PR</button>
    `;

    row.querySelector("button").onclick = () => fetchPR(exercise.name);

    targetExerciseList.appendChild(row);

  });

  targetModal.classList.remove("hidden");

}


// CLOSE MODAL
closeTargetModal.onclick = () => {

  targetModal.classList.add("hidden");

};


// FETCH PR
async function fetchPR(exerciseName){

  try{

    const res = await fetch(`/api/v1/prs/exercise/${encodeURIComponent(exerciseName)}`);
    console.log(res);
    

    const data = await res.json();

    if(data.status === "success"){

      const pr = data.data;

      const date = new Date(pr.date).toDateString();

      resultDiv.innerHTML = `
        <h3>🏆 Personal Record</h3>
        <p><strong>Exercise:</strong> ${pr.exercise}</p>
        <p><strong>Weight:</strong> ${pr.weight} ${pr.unit}</p>
        <p><strong>Reps:</strong> ${pr.reps}</p>
        <p><strong>Date:</strong> ${date}</p>
      `;

    } else {

      resultDiv.innerHTML = "<p style='color:red'>No PR found.</p>";

    }

  } catch(err){

    console.error(err);

    resultDiv.innerHTML = "<p style='color:red'>Error fetching PR.</p>";

  }

}