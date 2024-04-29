<script lang="ts">
	import { getFirebaseContext, collectionStore } from 'sveltefire';
	import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';

	import autoAnimate from '@formkit/auto-animate';
	import { Document, Packer, Paragraph, AlignmentType, HeadingLevel, Header, Footer } from 'docx';
	import CryptoJS from 'crypto-js';
	import { PUBLIC_SECRET_KEY } from '$env/static/public';
	import { toast } from 'svelte-sonner';

	type FormData = {
		id?: string;
		pass_phrase: string;
		project_name: string;
		members: {
			name: string;
			roll: string | number;
		}[];
	};

	let data: FormData = {
		pass_phrase: '',
		project_name: '',
		members: [
			{
				name: '',
				roll: ''
			},
			{
				name: '',
				roll: ''
			},
			{
				name: '',
				roll: ''
			}
		]
	};
	const { firestore } = getFirebaseContext();
	const projects = collectionStore<FormData>(firestore!, 'projects');
	$: alreadyEnrolledRolls = $projects.flatMap((curr) => curr.members.map((member) => member.roll));
	const handleSubmit = async (e: Event) => {
		e.preventDefault();
		handleMutualExclusion();
		// check if similar project exists
		const similarProject = $projects.find(
			(project) => project.project_name.toLowerCase() === data.project_name.toLowerCase()
		);
		if (similarProject) {
			toast.error('A project with the same name already exists.');
			return;
		}
		// encrypt pass phrase
		const pass = CryptoJS.AES.encrypt(data.pass_phrase, PUBLIC_SECRET_KEY).toString();
		await addDoc(collection(firestore!, 'projects'), {
			pass_phrase: pass,
			project_name: data.project_name,
			members: data.members
		});
		// download passphrase as txt not docx

		data = {
			pass_phrase: '',
			project_name: '',
			members: [
				{
					name: '',
					roll: ''
				},
				{
					name: '',
					roll: ''
				},
				{
					name: '',
					roll: ''
				}
			]
		};
	};
	const handleUpdate = async (e: Event) => {
		e.preventDefault();
		handleMutualExclusion();
		const currentProject = $projects.find((project) => project.id === selectedProject);
		const projectsRef = doc(firestore!, 'projects/' + currentProject!.id);
		await updateDoc(projectsRef, {
			project_name: data.project_name,
			members: data.members
		});
		data = {
			pass_phrase: '',
			project_name: '',
			members: [
				{
					name: '',
					roll: ''
				},
				{
					name: '',
					roll: ''
				},
				{
					name: '',
					roll: ''
				}
			]
		};
		toast.success('Project updated successfully');
	};

	const handleDownloadList = async (e: Event) => {
		const formData = $projects.map((item) => {
			return {
				project_name: item.project_name,
				members: item.members.map((member) => {
					return {
						name: member.name,
						roll: member.roll.toString()
					};
				})
			};
		});

		const doc = new Document({
			styles: {},
			sections: [
				{
					properties: {},
					headers: {
						default: new Header({
							children: [
								new Paragraph({
									text: 'Project List',
									heading: HeadingLevel.HEADING_1,
									alignment: AlignmentType.CENTER
								}),
								new Paragraph({
									text: 'System Analysis and Design',
									heading: HeadingLevel.HEADING_2,
									alignment: AlignmentType.CENTER
								}),
								new Paragraph({
									text: 'Department of BSc. CSIT',
									heading: HeadingLevel.HEADING_3,
									alignment: AlignmentType.CENTER
								}),
								new Paragraph({
									text: '',
									alignment: AlignmentType.LEFT
								})
							]
						})
					},
					footers: {
						default: new Footer({
							children: [
								new Paragraph({
									text: 'Department of BSc. CSIT',
									alignment: AlignmentType.CENTER
								}),
								new Paragraph({
									text: 'Prepared by Kishor U.',
									alignment: AlignmentType.CENTER
								})
							]
						})
					},
					children: [
						...formData
							.map((data, index) => {
								return [
									new Paragraph({
										text: `#${index + 1}`,
										alignment: AlignmentType.LEFT
									}),
									new Paragraph({
										text: `Project Name: ${data.project_name}`,
										alignment: AlignmentType.LEFT
									}),
									new Paragraph({ text: 'Members', alignment: AlignmentType.LEFT }),
									...data.members.map((data) => {
										return new Paragraph({
											text: `${data.name} (roll: ${data.roll})`,
											alignment: AlignmentType.LEFT,
											bullet: { level: 0 }
										});
									}),
									new Paragraph(''),
									new Paragraph('')
								];
							})
							.flat()
					]
				}
			]
		});

		const blob = await Packer.toBlob(doc);

		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'projects.docx';
		link.click();
		URL.revokeObjectURL(url);
	};
	let isEditMode = false;
	let isValid = false;
	let passKeyVerified = false;
	let selectedProject = '';

	const handlePassKeyVerification = () => {
		const currentProject = $projects.find((project) => project.id === selectedProject);

		const pass =
			CryptoJS.AES.decrypt(currentProject!.pass_phrase, PUBLIC_SECRET_KEY).toString(
				CryptoJS.enc.Utf8
			) ?? undefined;
		if (pass === data.pass_phrase) {
			passKeyVerified = true;
			toast.success('Pass key verified.');
		} else {
			toast.error('Pass key is incorrect.');
			passKeyVerified = false;
			passPhraseInput.value = '';
			passPhraseInput.focus();
			return;
		}
	};
	const handleMutualExclusion = () => {
		alreadyEnrolledRolls = alreadyEnrolledRolls.filter(
			(roll) => !data.members.map((member) => member.roll).includes(roll)
		);
	};
	const handleEdit = (_data: Omit<FormData, 'pass_phrase'>) => {
		data = {
			pass_phrase: '',
			project_name: _data.project_name,
			members: _data.members
		};
		toast.info('Enter pass phrase to edit team info.');
		passKeyVerified = false;
		isEditMode = true;
		handleMutualExclusion();
		passPhraseInput.focus();
	};
	const handleRollInput = (e: Event) => {
		const members = data.members.map((member) => {
			if (alreadyEnrolledRolls.includes(member.roll)) {
				toast.error(`Roll number ${member.roll} is already enrolled.`);
				member.roll = '';
				member.name = '';
			}
			return member;
		});
		data.members = members;
	};
	let passPhraseInput: HTMLInputElement;

	$: isValid = data.members.every((member) => member.name && member.roll);
</script>

<div
	class="grid lg:grid-cols-2 grid-cols-1 items-center place-items-center gap-10 w-screen justify-center h-screen px-4"
>
	<button
		class="absolute top-4 right-4 cursor-pointer z-20 text-gray-500"
		on:click={handleDownloadList}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			xmlns:xlink="http://www.w3.org/1999/xlink"
			fill="currentColor"
			height="30px"
			width="30px"
			version="1.1"
			id="Capa_1"
			viewBox="0 0 390.762 390.762"
			xml:space="preserve"
		>
			<g>
				<path
					d="M210.381,195.84V86.991h-30v109.305l-26.771-26.338l-21.04,21.385l51.834,50.996c2.918,2.871,6.718,4.308,10.521,4.308   c3.757,0,7.517-1.404,10.425-4.216l52.746-50.996l-20.852-21.568L210.381,195.84z"
				/>
				<path
					d="M308.381,0h-226C36.956,0,0,36.956,0,82.381v207.81v18.675c0,45.158,36.738,81.896,81.896,81.896h226.97   c45.157,0,81.896-36.738,81.896-81.896v-3.675v-15V82.381C390.762,36.956,353.806,0,308.381,0z M308.866,360.762H81.896   c-24.728,0-45.471-17.383-50.651-40.571h328.272C354.337,343.379,333.594,360.762,308.866,360.762z M30,290.19V82.381   C30,53.498,53.498,30,82.381,30h226c28.883,0,52.381,23.498,52.381,52.381v207.81H30z"
				/>
			</g>
		</svg>
	</button>
	<div class="flex-shrink-0 pt-10 max-w-[400px] place-items-center p-5">
		<div class="relative z-0 w-full mb-5 group font-bold">
			Fill the form for System Analysis & Design Projects
		</div>
		<div class="relative z-0 w-full mb-5 group">
			<input
				type="text"
				name="project_name"
				id="project_name"
				class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
				placeholder=" "
				required
				bind:this={passPhraseInput}
				bind:value={data.pass_phrase}
			/>
			<label
				for="project_name"
				class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
				>Pass Phrase (
				{isEditMode && !passKeyVerified ? 'verify to continue' : 'save this phrase'}
				)</label
			>
			{#if isEditMode}
				<button
					on:click={handlePassKeyVerification}
					class="absolute top-1/2 -translate-y-1/2 right-4 cursor-pointer z-20 text-gray-500"
				>
					verify
				</button>
			{/if}
		</div>
		<div class="relative z-0 w-full mb-5 group">
			<input
				type="text"
				name="project_name"
				id="project_name"
				class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
				placeholder=" "
				required
				readonly={isEditMode && !passKeyVerified}
				bind:value={data.project_name}
			/>
			<label
				for="project_name"
				class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
				>Project Name</label
			>
		</div>
		{#each data.members as member, index}
			<div class="grid md:grid-cols-2 md:gap-6">
				<div class="relative z-0 w-full mb-5 group">
					<input
						type="number"
						name="roll"
						id="roll"
						class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
						placeholder=" "
						required
						readonly={isEditMode && !passKeyVerified}
						on:blur={handleRollInput}
						bind:value={member.roll}
					/>
					<label
						for="roll"
						class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
					>
						Roll (member {index + 1})</label
					>
				</div>
				<div class="relative z-0 w-full mb-5 group">
					<input
						type="text"
						name="member1_name"
						id="member1_name"
						class="block py-2.5 px-0 w-full text-sm text-gray-900 bg-transparent border-0 border-b-2 border-gray-300 appearance-none dark:border-gray-600 dark:focus:border-blue-500 focus:outline-none focus:ring-0 focus:border-blue-600 peer"
						placeholder=" "
						readonly={isEditMode && !passKeyVerified}
						required
						bind:value={member.name}
					/>
					<label
						for="member1_name"
						class="peer-focus:font-medium absolute text-sm text-gray-500 dark:text-gray-400 duration-300 transform -translate-y-6 scale-75 top-3 -z-10 origin-[0] peer-focus:start-0 rtl:peer-focus:translate-x-1/4 peer-focus:text-blue-600 peer-focus:dark:text-blue-500 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-6"
					>
						Member {index + 1}
					</label>
				</div>
			</div>
		{/each}
		<button
			type="submit"
			class="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm w-full sm:w-auto px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
			on:click={(e) => {
				if (isEditMode && passKeyVerified) {
					handleUpdate(e);
				} else {
					handleSubmit(e);
				}
			}}
			class:disabled={!isValid}
			class:cursor-not-allowed={!isValid}
			disabled={!isValid}>Submit</button
		>
	</div>
	<div class="py-12 w-full flex-shrink-0 px-5 h-screen overflow-y-auto overflow-x-visible relative">
		<div class="w-full font-bold text-xl mb-4">List of projects</div>
		<div
			class=" mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 content-start gap-5"
			use:autoAnimate
		>
			{#each $projects as project, index}
				<div
					class=" w-full h-[200px] max-h-[200px] min-w-[200px] sm:max-w-[250px] flex flex-col items-start justify-center relative"
				>
					<button
						class="absolute top-0 right-0 m-2 text-gray-400 z-10 hover:text-gray-900"
						title="Edit"
						on:click={() => {
							handleEdit({
								project_name: project.project_name,
								members: project.members
							});
							selectedProject = project.id ?? '';
						}}
						><svg
							id="Edit_24"
							width="24"
							height="24"
							viewBox="0 0 24 24"
							xmlns="http://www.w3.org/2000/svg"
							xmlns:xlink="http://www.w3.org/1999/xlink"
							><rect width="24" height="24" stroke="none" fill="currentColor" opacity="0" />

							<g transform="matrix(0.83 0 0 0.83 12 12)">
								<path
									style="stroke: none; stroke-width: 1; stroke-dasharray: none; stroke-linecap: butt; stroke-dashoffset: 0; stroke-linejoin: miter; stroke-miterlimit: 4; fill: currentColor; fill-rule: nonzero; opacity: 1;"
									transform=" translate(-15, -15)"
									d="M 22.828125 3 C 22.316375 3 21.804562 3.1954375 21.414062 3.5859375 L 19 6 L 24 11 L 26.414062 8.5859375 C 27.195062 7.8049375 27.195062 6.5388125 26.414062 5.7578125 L 24.242188 3.5859375 C 23.851688 3.1954375 23.339875 3 22.828125 3 z M 17 8 L 5.2597656 19.740234 C 5.2597656 19.740234 6.1775313 19.658 6.5195312 20 C 6.8615312 20.342 6.58 22.58 7 23 C 7.42 23.42 9.6438906 23.124359 9.9628906 23.443359 C 10.281891 23.762359 10.259766 24.740234 10.259766 24.740234 L 22 13 L 17 8 z M 4 23 L 3.0566406 25.671875 C 3.019555391732378 25.777315948579314 3.0004098353434143 25.88822818626975 3 26 C 3 26.552284749830793 3.4477152501692068 27 4 27 C 4.111771836422188 26.999590036115436 4.22268407474976 26.98044434440919 4.328125 26.943359 C 4.331387024617978 26.942074127865663 4.334642269631416 26.940772109861395 4.3378906 26.939453 L 4.3632812 26.931641 C 4.3652389131533935 26.93034554822427 4.367192058595549 26.929043206816875 4.3691406 26.927734 L 7 26 L 5.5 24.5 L 4 23 z"
									stroke-linecap="round"
								/>
							</g>
						</svg></button
					>
					<span
						class="text-gray-600 font-black opacity-10 text-[100px] flex items-end absolute sm:left-[100px] right-0 sm:right-[unset] -bottom-6"
					>
						#{index + 1}
					</span>
					<div class="font-bold flex justify-between gap-4 mb-3">
						{project.project_name.toUpperCase()}
					</div>
					<!-- list in two columns -->
					<div class="grid grid-cols-1 w-full justify-center">
						{#each project.members as member}
							<div class="flex flex-row items-start justify-start gap-1">
								<p class="text-gray-600">{member.roll}.</p>
								<h3 class="mb-2">
									{member.name
										.split(' ')
										.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
										.join(' ')}
								</h3>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

<style>
	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	input[type='number'] {
		-moz-appearance: textfield;
	}
	/* if input readonly make its opacity 50% */
	input[readonly] {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
